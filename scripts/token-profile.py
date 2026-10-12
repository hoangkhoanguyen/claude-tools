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
    seen, times = {}, []
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
    usage = C.Counter()
    peak = 0
    for u in seen.values():
        for k in ('input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens', 'output_tokens'):
            usage[k] += u.get(k, 0) or 0
        peak = max(peak, sum(u.get(k, 0) or 0 for k in
                             ('input_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens')))
    times.sort()
    dur = (ts(times[-1]) - ts(times[0])).total_seconds() if len(times) > 1 else 0
    return dict(turns=len(seen), w=weight(usage), peak=peak, dur=dur, reads=reads, images=images,
                edits=edits, commits=commits, start=times[0] if times else None)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('project_dir')
    ap.add_argument('--since', help='only sessions started on/after this date (YYYY-MM-DD)')
    ap.add_argument('--json', help='also write the aggregate as JSON')
    a = ap.parse_args()

    by_type = C.defaultdict(lambda: dict(n=0, w=0.0, turns=0, dur=0.0, peaks=[], images=0,
                                         reads=C.Counter(), edits=C.Counter(), commits=C.Counter()))
    spawns = C.Counter()   # (session, parent, task) -> feature-builder spawns
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
            g['reads'].update(s['reads'])
            g['edits'].update(s['edits'])
            g['commits'].update(s['commits'])
            if t == 'feature-builder':
                key = re.sub(r'\s*\(.*?\)|retry|attempt \d+|escalat\w*|opus|sonnet', '',
                             meta.get('description', ''), flags=re.I).strip()[:50]
                spawns[(sid, meta.get('parentAgentId'), key)] += 1

    total = main_w + sum(g['w'] for g in by_type.values()) or 1
    print(f'sessions analysed: {sessions}   total weighted tokens: {total / 1e6:.1f}M')
    print(f'\n{"agent":24s} {"n":>5s} {"share":>6s} {"avg M":>7s} {"turns":>6s} {"peak ctx":>9s} {"avg min":>8s} {"img":>5s}')
    print(f'{"(main conversation)":24s} {"":>5s} {main_w / total * 100:5.1f}% {"":>7s} {main_turns:6d}')
    for t, g in sorted(by_type.items(), key=lambda kv: -kv[1]['w']):
        peaks = sorted(g['peaks'])
        print(f'{t:24s} {g["n"]:5d} {g["w"] / total * 100:5.1f}% {g["w"] / g["n"] / 1e6:7.2f} '
              f'{g["turns"] / g["n"]:6.0f} {peaks[len(peaks) // 2] // 1000:8d}k {g["dur"] / g["n"] / 60:8.1f} {g["images"]:5d}')

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
