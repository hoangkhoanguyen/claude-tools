#!/usr/bin/env python3
"""Profile where the SDLC plugin spends tokens and time, from Claude Code transcripts.

Usage:
    python3 scripts/token-profile.py <project-transcript-dir> [--since YYYY-MM-DD] [--json out.json]

<project-transcript-dir> is ~/.claude/projects/<encoded-project-path>. Only sessions that ran
/sdlc:run or /sdlc:execute are analysed. Subagent transcripts come from
<session>/subagents/*.jsonl (+ .meta.json with agentType / model / parentAgentId).

Token weight = input + 1.25*cache_write + 0.1*cache_read + 5*output (input-price units; an
approximation, it ignores the Opus vs Sonnet price gap). Compare runs BEFORE/AFTER a plugin
change with the same script; also compare the quality signal (retries, source fixes made
by the Test/QA legs), since cheaper is only better if no more bugs slip through.
"""
import argparse
import collections as C
import glob
import json
import os
import re
from datetime import datetime

SPEC_FILES = {'design.md', 'tasks.md', 'requirements.md', 'ui-design.md', 'architecture.md',
              'CLAUDE.md', 'state.md', 'test-report.md', 'design-system.md'}
CMD_RE = re.compile(r'<command-name>/sdlc:(run|execute)</command-name>')


def ts(s):
    return datetime.fromisoformat(s.replace('Z', '+00:00'))


def weight(u):
    return (u.get('input_tokens', 0) + 1.25 * u.get('cache_creation_input_tokens', 0)
            + 0.1 * u.get('cache_read_input_tokens', 0) + 5 * u.get('output_tokens', 0))


def parse(path):
    """Stats for one transcript; assistant messages are de-duplicated by message id."""
    seen, times, order = {}, [], {}
    models = C.Counter()
    reads, images, edits, commits = C.Counter(), 0, C.Counter(), C.Counter()
    for line in open(path, errors='ignore'):
        try:
            d = json.loads(line)
        except ValueError:
            continue
        if d.get('timestamp'):
            times.append(d['timestamp'])
        msg = d.get('message') or {}
        if d.get('type') == 'assistant':
            if msg.get('id') and msg.get('usage'):
                seen[msg['id']] = msg['usage']
                order[msg['id']] = d.get('timestamp')
                fam = re.search(r'(opus|sonnet|haiku)', msg.get('model') or '')
                models[msg['id']] = fam.group(1) if fam else 'other'
            for c in msg.get('content') or []:
                if not (isinstance(c, dict) and c.get('type') == 'tool_use'):
                    continue
                inp = c.get('input') or {}
                if c['name'] == 'Read':
                    base = os.path.basename(inp.get('file_path', ''))
                    reads[base if base in SPEC_FILES else '(other)'] += 1
                elif c['name'] in ('Edit', 'Write'):
                    p = inp.get('file_path', '')
                    kind = ('spec' if '/.sdlc/' in p else
                            'test' if re.search(r'\.(test|spec)\.|/tests?/|e2e', p) else 'src')
                    edits[kind] += 1
                elif c['name'] == 'Bash':
                    for m in re.finditer(r'git commit[^\n]*?\b(feat|fix|test|docs|chore|refactor)\(',
                                         inp.get('command', '')):
                        commits[m.group(1)] += 1
        elif d.get('type') == 'user' and isinstance(msg.get('content'), list):
            for c in msg['content']:
                if isinstance(c, dict) and c.get('type') == 'tool_result' and isinstance(c.get('content'), list):
                    images += sum(1 for s in c['content'] if isinstance(s, dict) and s.get('type') == 'image')
    # cache rebuilds: a turn that re-writes a large prompt after an idle gap (prompt cache expired)
    rebuilds, rebuilt, prev_t = 0, 0, None
    for mid in order:
        t, u = order[mid], seen[mid]
        cc = u.get('cache_creation_input_tokens', 0) or 0
        if prev_t and t and cc > 50000 and (ts(t) - ts(prev_t)).total_seconds() > 240:
            rebuilds += 1
            rebuilt += cc
        prev_t = t or prev_t
    usage = C.Counter()
    peak = 0
    for u in seen.values():
        for k in ('input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens'):
            usage[k] += u.get(k, 0) or 0
        peak = max(peak, sum(u.get(k, 0) or 0 for k in
                             ('input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens')))
    times.sort()
    dur = (ts(times[-1]) - ts(times[0])).total_seconds() if len(times) > 1 else 0
    by_model = C.Counter()
    for mid, u in seen.items():
        by_model[models.get(mid, 'other')] += weight(u)
    return dict(turns=len(seen), w=weight(usage), peak=peak, dur=dur, reads=reads, images=images,
                edits=edits, commits=commits, start=times[0] if times else None,
                cr=usage['cache_read_input_tokens'], by_model=by_model,
                rebuilds=rebuilds, rebuilt=rebuilt)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('project_dir')
    ap.add_argument('--since', help='only sessions started on/after this date (YYYY-MM-DD)')
    ap.add_argument('--json', help='also write the aggregate as JSON')
    a = ap.parse_args()

    by_type = C.defaultdict(lambda: dict(n=0, w=0.0, turns=0, dur=0.0, peaks=[], images=0,
                                         reads=C.Counter(), edits=C.Counter(), commits=C.Counter()))
    spawns = C.Counter()   # (session, parent, task) -> feature-builder spawns
    model_w = C.Counter()
    batch = C.defaultdict(lambda: [0, 0.0, 0])   # tasks-per-builder -> [spawns, weighted, turns]
    sess_hours = []
    main_w = main_turns = 0
    sessions = 0
    for f in glob.glob(os.path.join(a.project_dir, '*.jsonl')):
        if not CMD_RE.search(open(f, errors='ignore').read()):
            continue
        st = parse(f)
        if a.since and st['start'] and st['start'][:10] < a.since:
            continue
        sid = os.path.basename(f)[:-6]
        sessions += 1
        main_w += st['w']
        main_turns += st['turns']
        model_w.update(st['by_model'])
        sess_hours.append(st['dur'] / 3600)
        for sf in glob.glob(os.path.join(a.project_dir, sid, 'subagents', '*.jsonl')):
            mf = sf[:-6] + '.meta.json'
            meta = json.load(open(mf)) if os.path.exists(mf) else {}
            t = meta.get('agentType', '?')
            s = parse(sf)
            g = by_type[t]
            g['n'] += 1
            g['w'] += s['w']
            g['turns'] += s['turns']
            g['dur'] += s['dur']
            g['peaks'].append(s['peak'])
            g['images'] += s['images']
            g['cr'] = g.get('cr', 0) + s['cr']
            g['rebuilds'] = g.get('rebuilds', 0) + s['rebuilds']
            g['rebuilt'] = g.get('rebuilt', 0) + s['rebuilt']
            model_w.update(s['by_model'])
            g['reads'].update(s['reads'])
            g['edits'].update(s['edits'])
            g['commits'].update(s['commits'])
            if t == 'feature-builder':
                n_tasks = max(1, len(set(re.findall(r'TASK-?\d+', meta.get('description', '')))))
                b = batch[min(n_tasks, 4)]
                b[0] += 1
                b[1] += s['w']
                b[2] += s['turns']
                key = re.sub(r'\s*\(.*?\)|retry|attempt \d+|escalat\w*|opus|sonnet', '',
                             meta.get('description', ''), flags=re.I).strip()[:50]
                spawns[(sid, meta.get('parentAgentId'), key)] += 1

    total = main_w + sum(g['w'] for g in by_type.values()) or 1
    print(f'sessions analysed: {sessions}   total weighted tokens: {total / 1e6:.1f}M')
    print(f'\n{"agent":24s} {"n":>5s} {"share":>6s} {"avg M":>7s} {"turns":>6s} {"peak ctx":>9s} {"avg min":>8s} {"img":>5s} {"cache-rd":>8s}')
    print(f'{"(main conversation)":24s} {"":>5s} {main_w / total * 100:5.1f}% {"":>7s} {main_turns:6d}')
    for t, g in sorted(by_type.items(), key=lambda kv: -kv[1]['w']):
        peaks = sorted(g['peaks'])
        print(f'{t:24s} {g["n"]:5d} {g["w"] / total * 100:5.1f}% {g["w"] / g["n"] / 1e6:7.2f} '
              f'{g["turns"] / g["n"]:6.0f} {peaks[len(peaks) // 2] // 1000:8d}k {g["dur"] / g["n"] / 60:8.1f} {g["images"]:5d} '
              f'{0.1 * g.get("cr", 0) / max(g["w"], 1) * 100:7.0f}%')

    tw = sum(model_w.values()) or 1
    print('\nWeighted tokens by model: ' + ', '.join(f'{k} {v / tw * 100:.0f}%' for k, v in model_w.most_common()))
    if sess_hours:
        sh = sorted(sess_hours)
        print(f'Session wall-clock hours: median {sh[len(sh) // 2]:.1f}, max {sh[-1]:.1f} '
              f'(includes time spent waiting for you)')
    fb = by_type.get('feature-builder')
    if fb and batch:
        print('\nfeature-builder by tasks-per-spawn (batch size, parsed from the spawn description):')
        for k in sorted(batch):
            n, w, tu = batch[k]
            tasks = k * n
            print(f'  {k}{"+" if k == 4 else " "} task(s): spawns={n:4d}  M/task={w / tasks / 1e6:5.2f}  turns/task={tu / tasks:5.1f}')

    print('\nPrompt-cache rebuilds (turn after an idle gap > 4 min re-writing > 50k tokens; check what the agent was waiting on):')
    for t, g in sorted(by_type.items(), key=lambda kv: -kv[1].get('rebuilt', 0)):
        if g.get('rebuilds'):
            print(f'  {t:24s} rebuilds={g["rebuilds"]:3d}  re-written={g["rebuilt"] / 1e6:5.2f}M tokens')

    print('\nSpec-file Reads per agent (avg per agent):')
    for t in ('feature-builder', 'test-strategist', 'implement-coordinator', 'qa-guard'):
        g = by_type.get(t)
        if g:
            print(f'  {t:24s}', {k: round(v / g['n'], 1) for k, v in g['reads'].most_common(6)})

    print('\nQuality signals (lower cost is only a win if these do not get worse):')
    for t in ('test-strategist', 'qa-guard'):
        g = by_type.get(t)
        if g:
            print(f'  {t:24s} source edits/agent={g["edits"]["src"] / g["n"]:.2f}  '
                  f'commits={dict(g["commits"])}')
    dist = C.Counter(spawns.values())
    print(f'  feature-builder spawns per task/batch (retries): {dict(sorted(dist.items()))}')

    if a.json:
        out = dict(sessions=sessions, total_weighted=total, main_weighted=main_w,
                   by_agent={t: dict(n=g['n'], weighted=g['w'], turns=g['turns'], dur_s=g['dur'])
                             for t, g in by_type.items()})
        json.dump(out, open(a.json, 'w'), indent=2)


if __name__ == '__main__':
    main()
