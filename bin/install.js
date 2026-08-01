#!/usr/bin/env node
/**
 * SDLC Workflow — installer.
 *
 * Copies resources (agents / commands / skills / hooks / CLAUDE.md) from this repo
 * into the TARGET PROJECT's .claude directory. Designed to run online, e.g.:
 *
 *   npx github:hoangkhoanguyen/claude-tools            # install into the current project's ./.claude
 *   npx github:hoangkhoanguyen/claude-tools --global   # install into ~/.claude
 *
 * Characteristics:
 *   - Zero-dependency (Node built-ins only) → npx runs fast and installs nothing extra.
 *   - Idempotent: re-running after a repo update only overwrites files the user has NOT
 *     edited; edited files prompt (thanks to the .sdlc-install.json manifest recording
 *     checksums at install time).
 *   - Safe merging for settings.json (hooks) and CLAUDE.md (managed block) — no blind overwrite.
 *   - Component selection, dry-run, backup, per-file prompting.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const readline = require('readline');
const { spawnSync } = require('child_process');

// ---------------------------------------------------------------------------
// Constants & metadata
// ---------------------------------------------------------------------------

const SRC_ROOT = path.resolve(__dirname, '..');
const PKG = readJsonSafe(path.join(SRC_ROOT, 'package.json')) || {};
const PLUGIN_NAME = PKG.name || 'sdlc-workflow';
const PLUGIN_VERSION = PKG.version || '0.0.0';
const MANIFEST_NAME = '.sdlc-install.json';
const HOOK_SCRIPT = 'sdlc-session-start.sh';
const CLAUDE_MD_START = '<!-- sdlc-workflow:start (managed — do not hand-edit inside this block) -->';
const CLAUDE_MD_END = '<!-- sdlc-workflow:end -->';

// Marker start tags used by earlier releases. Installs made with those still carry
// the old tag in their CLAUDE.md, so detection must match them too — otherwise an
// update would append a second block instead of replacing the existing one.
// We only ever WRITE CLAUDE_MD_START, so old installs migrate on their next update.
const CLAUDE_MD_START_LEGACY = [
  '<!-- sdlc-workflow:start (managed — đừng sửa tay trong block này) -->',
];

// Installable components. `dir` = source directory; `type` decides how it's handled.
const COMPONENTS = {
  agents:    { type: 'files', dir: 'agents',   label: 'Custom agents' },
  commands:  { type: 'files', dir: 'commands', label: 'Slash commands (/sdlc:*)' },
  skills:    { type: 'files', dir: 'skills',   label: 'Skills' },
  templates: { type: 'files', dir: 'templates', label: 'Templates (state.template.md — referenced by commands)' },
  hooks:     { type: 'hooks', dir: 'hooks',    label: 'SessionStart hook + registration in settings.json' },
  'claude-md': { type: 'claude-md',            label: 'SDLC principles (managed block in CLAUDE.md)' },
};
const DEFAULT_COMPONENTS = ['agents', 'commands', 'skills', 'templates', 'hooks'];

// ---------------------------------------------------------------------------
// Terminal colors (auto-disabled when not a TTY or when NO_COLOR is set)
// ---------------------------------------------------------------------------

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = {
  dim: (s) => (useColor ? `\x1b[2m${s}\x1b[0m` : s),
  bold: (s) => (useColor ? `\x1b[1m${s}\x1b[0m` : s),
  green: (s) => (useColor ? `\x1b[32m${s}\x1b[0m` : s),
  yellow: (s) => (useColor ? `\x1b[33m${s}\x1b[0m` : s),
  red: (s) => (useColor ? `\x1b[31m${s}\x1b[0m` : s),
  cyan: (s) => (useColor ? `\x1b[36m${s}\x1b[0m` : s),
};

// ---------------------------------------------------------------------------
// Command-line argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    global: false,
    dir: null,
    only: null,
    skip: [],
    onConflict: 'ask', // ask | overwrite | skip | backup
    dryRun: false,
    yes: false,
    help: false,
    version: false,
    list: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '-h': case '--help': opts.help = true; break;
      case '-v': case '--version': opts.version = true; break;
      case '--list': opts.list = true; break;
      case '-g': case '--global': opts.global = true; break;
      case '--dir': opts.dir = next(); break;
      case '--only': opts.only = splitList(next()); break;
      case '--skip': opts.skip = splitList(next()); break;
      case '--dry-run': case '-n': opts.dryRun = true; break;
      case '-y': case '--yes': opts.yes = true; break;
      case '--force': opts.onConflict = 'overwrite'; break;
      case '--on-conflict': opts.onConflict = next(); break;
      default:
        if (a.startsWith('--only=')) opts.only = splitList(a.slice(7));
        else if (a.startsWith('--skip=')) opts.skip = splitList(a.slice(7));
        else if (a.startsWith('--dir=')) opts.dir = a.slice(6);
        else if (a.startsWith('--on-conflict=')) opts.onConflict = a.slice(14);
        else fail(`Invalid argument: ${a} (run --help for usage)`);
    }
  }
  if (!['ask', 'overwrite', 'skip', 'backup'].includes(opts.onConflict)) {
    fail(`--on-conflict must be ask|overwrite|skip|backup (got: ${opts.onConflict})`);
  }
  return opts;
}

function splitList(s) {
  return String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// fs / hash / json utilities
// ---------------------------------------------------------------------------

function readJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}
function sha256(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}
function sha256str(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}
function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}
function ensureDir(p) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
}

// ---------------------------------------------------------------------------
// Resolving the target directory
// ---------------------------------------------------------------------------

function resolveTarget(opts) {
  if (opts.dir) {
    return { base: path.resolve(opts.dir), mode: 'custom' };
  }
  if (opts.global) {
    return { base: path.join(os.homedir(), '.claude'), mode: 'global' };
  }
  return { base: path.join(process.cwd(), '.claude'), mode: 'project' };
}

// ---------------------------------------------------------------------------
// Collecting the files to install, per component
// ---------------------------------------------------------------------------

function collectFiles(componentKeys, base) {
  // Returns an array of { component, src, dest, rel } for 'files'/'hooks' components.
  const items = [];
  for (const key of componentKeys) {
    const comp = COMPONENTS[key];
    if (!comp || (comp.type !== 'files' && comp.type !== 'hooks')) continue;
    const srcDir = path.join(SRC_ROOT, comp.dir);
    for (const src of walk(srcDir)) {
      const relInDir = path.relative(srcDir, src);
      // hooks.json is the plugin-side format (${CLAUDE_PLUGIN_ROOT}); in the target we
      // register the hook via settings.json instead, so skip this file when copying.
      if (key === 'hooks' && relInDir === 'hooks.json') continue;
      const rel = path.join(comp.dir, relInDir); // e.g. agents/architect.md
      items.push({ component: key, src, dest: path.join(base, rel), rel });
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// Deciding the action for a single ordinary file
// ---------------------------------------------------------------------------

function decideFile(item, manifest) {
  const srcHash = sha256(item.src);
  if (!fs.existsSync(item.dest)) {
    return { ...item, action: 'install', srcHash };
  }
  const destHash = sha256(item.dest);
  if (destHash === srcHash) {
    return { ...item, action: 'up-to-date', srcHash };
  }
  const prev = manifest.files && manifest.files[item.rel];
  if (prev && prev.installedHash === destHash) {
    // The user hasn't touched the file since the last install → safe to update.
    return { ...item, action: 'update', srcHash };
  }
  // dest exists, differs from src, and the user edited it (or it was never installed) → conflict.
  return { ...item, action: 'conflict', srcHash, destHash };
}

// ---------------------------------------------------------------------------
// Prompt (interactive)
// ---------------------------------------------------------------------------

function makePrompter() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return {
    ask: (q) => new Promise((res) => rl.question(q, (ans) => res(ans.trim()))),
    close: () => rl.close(),
  };
}

// ---------------------------------------------------------------------------
// Writing files + backups
// ---------------------------------------------------------------------------

function backupFile(dest) {
  let bak = `${dest}.bak`;
  if (fs.existsSync(bak)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    bak = `${dest}.bak-${stamp}`;
  }
  fs.copyFileSync(dest, bak);
  return bak;
}
function writeFile(dest, src) {
  ensureDir(dest);
  fs.copyFileSync(src, dest);
}

// ---------------------------------------------------------------------------
// Diff (uses the system `diff` command when available)
// ---------------------------------------------------------------------------

function showDiff(dest, src) {
  const r = spawnSync('diff', ['-u', dest, src], { encoding: 'utf8' });
  if (r.error) {
    console.log(c.dim('  (no `diff` command found on this machine — skipping)'));
    return;
  }
  const body = (r.stdout || '').split('\n').slice(0, 60).join('\n');
  console.log(c.dim(body || '  (no differences to show)'));
  if ((r.stdout || '').split('\n').length > 60) console.log(c.dim('  … (truncated)'));
}

// ---------------------------------------------------------------------------
// Merging the hook into the target's settings.json
// ---------------------------------------------------------------------------

function hookCommandFor(target, base) {
  const scriptPath = path.join(base, 'hooks', HOOK_SCRIPT);
  // Project installs into ./.claude → use $CLAUDE_PROJECT_DIR so it stays portable (committable).
  if (target.mode === 'project' && base === path.join(process.cwd(), '.claude')) {
    return `bash "$CLAUDE_PROJECT_DIR/.claude/hooks/${HOOK_SCRIPT}"`;
  }
  // Global / custom → absolute path.
  return `bash "${scriptPath}"`;
}

function planHookRegistration(target, base) {
  const settingsPath = path.join(base, 'settings.json');
  const command = hookCommandFor(target, base);
  const existing = readJsonSafe(settingsPath) || {};
  const before = JSON.stringify(existing);

  const next = JSON.parse(JSON.stringify(existing));
  next.hooks = next.hooks || {};
  const arr = Array.isArray(next.hooks.SessionStart) ? next.hooks.SessionStart : [];
  // Remove any old SDLC entry (identified by the script name) to stay idempotent, then add the new one.
  const cleaned = arr.filter((e) => {
    const cmds = (e && Array.isArray(e.hooks)) ? e.hooks.map((h) => h && h.command).join(' ') : '';
    return !cmds.includes(HOOK_SCRIPT);
  });
  cleaned.push({ hooks: [{ type: 'command', command }] });
  next.hooks.SessionStart = cleaned;

  const after = JSON.stringify(next);
  return {
    settingsPath,
    changed: before !== after,
    write: () => {
      ensureDir(settingsPath);
      fs.writeFileSync(settingsPath, JSON.stringify(next, null, 2) + '\n');
    },
  };
}

// ---------------------------------------------------------------------------
// Merging CLAUDE.md (managed block)
// ---------------------------------------------------------------------------

function claudeMdTargetPath(target, base) {
  // The SDLC principles belong in the CLAUDE.md that Claude Code reads:
  //  - project: <cwd>/CLAUDE.md
  //  - global:  ~/.claude/CLAUDE.md
  //  - custom:  <base>/CLAUDE.md
  if (target.mode === 'project' && base === path.join(process.cwd(), '.claude')) {
    return path.join(process.cwd(), 'CLAUDE.md');
  }
  if (target.mode === 'global') return path.join(base, 'CLAUDE.md');
  return path.join(base, 'CLAUDE.md');
}

function planClaudeMd(target, base) {
  const srcMd = path.join(SRC_ROOT, 'CLAUDE.md');
  if (!fs.existsSync(srcMd)) return null;
  const dest = claudeMdTargetPath(target, base);
  const block = `${CLAUDE_MD_START}\n${fs.readFileSync(srcMd, 'utf8').trim()}\n${CLAUDE_MD_END}`;

  let current = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : '';
  let next;
  // Match the current start tag OR any legacy one, so blocks written by an older
  // release get replaced in place (and thereby migrated to the new tag).
  const startAlternatives = [CLAUDE_MD_START, ...CLAUDE_MD_START_LEGACY]
    .map(escapeRe)
    .join('|');
  const re = new RegExp(
    `(?:${startAlternatives})[\\s\\S]*?${escapeRe(CLAUDE_MD_END)}`,
    'm'
  );
  if (re.test(current)) {
    next = current.replace(re, block); // update the existing block
  } else {
    next = current
      ? current.replace(/\s*$/, '') + `\n\n${block}\n`
      : `${block}\n`; // append at the end, or create the file
  }
  return {
    dest,
    changed: next !== current,
    isNew: !fs.existsSync(dest),
    write: () => { ensureDir(dest); fs.writeFileSync(dest, next); },
  };
}
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

function loadManifest(base) {
  return readJsonSafe(path.join(base, MANIFEST_NAME)) || { files: {} };
}
function saveManifest(base, manifest) {
  const p = path.join(base, MANIFEST_NAME);
  ensureDir(p);
  fs.writeFileSync(p, JSON.stringify(manifest, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelp() {
  console.log(`
${c.bold('SDLC Workflow installer')} ${c.dim('v' + PLUGIN_VERSION)}

Installs agents / commands / skills / hooks into the target project's .claude.

${c.bold('Usage:')}
  npx github:hoangkhoanguyen/claude-tools [options]

${c.bold('Install target (default: ./.claude of the current project):')}
  -g, --global            Install into ~/.claude (used by every project)
      --dir <path>        Install into .claude at the given directory

${c.bold('Component selection:')}
      --only a,b,c        Install only these components
      --skip a,b,c        Install everything except these components
      --list              List the components and exit
  ${c.dim('Components: ' + Object.keys(COMPONENTS).join(', '))}
  ${c.dim('Default:    ' + DEFAULT_COMPONENTS.join(', ') + '  (claude-md must be enabled explicitly via --only)')}

${c.bold('Handling conflicts when a file already exists:')}
      --on-conflict ask       Prompt per file (the default when a TTY is available)
      --on-conflict overwrite Overwrite (alias: --force)
      --on-conflict skip      Keep your file as-is
      --on-conflict backup    Back up to .bak, then overwrite
  ${c.dim('Files you have NOT edited since the last install are always updated automatically, without prompting.')}

${c.bold('Other:')}
  -n, --dry-run           Only show what would happen, write nothing
  -y, --yes               Don't prompt (non-TTY defaults to --on-conflict backup)
  -v, --version           Print the version
  -h, --help              Show this help

${c.bold('Private repo:')} set GITHUB_TOKEN in the environment before running npx,
or use: npx git+https://<token>@github.com/owner/repo
`);
}

function printList() {
  console.log(c.bold('\nInstallable components:\n'));
  for (const [key, comp] of Object.entries(COMPONENTS)) {
    const def = DEFAULT_COMPONENTS.includes(key) ? c.green(' [default]') : c.dim(' [opt-in]');
    console.log(`  ${c.cyan(key.padEnd(11))} ${comp.label}${def}`);
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// Resolving the component list
// ---------------------------------------------------------------------------

function resolveComponents(opts) {
  let keys = opts.only ? opts.only.slice() : DEFAULT_COMPONENTS.slice();
  for (const k of keys) {
    if (!COMPONENTS[k]) fail(`No such component: ${k} (see --list)`);
  }
  if (opts.skip.length) keys = keys.filter((k) => !opts.skip.includes(k));
  return keys;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) return printHelp();
  if (opts.version) return console.log(`${PLUGIN_NAME} v${PLUGIN_VERSION}`);
  if (opts.list) return printList();

  const target = resolveTarget(opts);
  const base = target.base;
  const components = resolveComponents(opts);

  // Non-TTY with 'ask' → can't prompt, fall back to backup (safe, loses no data).
  const interactive = process.stdin.isTTY && process.stdout.isTTY && !opts.yes;
  if (opts.onConflict === 'ask' && !interactive) {
    opts.onConflict = 'backup';
  }

  console.log(c.bold(`\n${PLUGIN_NAME} v${PLUGIN_VERSION}`));
  console.log(`Target:      ${c.cyan(base)} ${c.dim('(' + target.mode + ')')}`);
  console.log(`Components:  ${c.cyan(components.join(', '))}`);
  console.log(`Conflicts:   ${c.cyan(opts.onConflict)}${opts.dryRun ? c.yellow('   [DRY-RUN]') : ''}\n`);

  const manifest = loadManifest(base);

  // 1) Plan the ordinary files (agents/commands/skills/hooks scripts)
  const fileItems = collectFiles(components, base).map((it) => decideFile(it, manifest));

  // 2) Plan the hook registration & claude-md
  const hookPlan = components.includes('hooks') ? planHookRegistration(target, base) : null;
  const claudeMdPlan = components.includes('claude-md') ? planClaudeMd(target, base) : null;

  // Running tallies
  const counts = { install: 0, update: 0, 'up-to-date': 0, conflict: 0, skipped: 0, backup: 0 };

  const prompter = interactive ? makePrompter() : null;
  let bulkChoice = null; // 'O'|'S'|'B' applied to every remaining conflict

  const newManifestFiles = { ...(manifest.files || {}) };

  // 3) Process each file
  for (const item of fileItems) {
    const tag = c.dim(item.rel);
    if (item.action === 'install' || item.action === 'update') {
      counts[item.action]++;
      console.log(`  ${c.green(item.action === 'install' ? 'install ' : 'update  ')} ${tag}`);
      if (!opts.dryRun) writeFile(item.dest, item.src);
      newManifestFiles[item.rel] = { installedHash: item.srcHash };
      continue;
    }
    if (item.action === 'up-to-date') {
      counts['up-to-date']++;
      newManifestFiles[item.rel] = { installedHash: item.srcHash };
      continue; // silent
    }
    // action === 'conflict'
    let decision = opts.onConflict; // overwrite | skip | backup | ask
    if (decision === 'ask') {
      decision = bulkChoice ? bulkMap(bulkChoice) : await askConflict(prompter, item);
      if (decision && decision.startsWith('bulk:')) {
        bulkChoice = decision.split(':')[1];
        decision = bulkMap(bulkChoice);
      }
    }
    await applyConflict(decision, item, opts, counts, newManifestFiles);
  }

  if (prompter) prompter.close();

  // 3b) Clean up obsolete files: present in the previous manifest but no longer in the source.
  // Happens when the repo restructures (e.g. commands/run.md → commands/sdlc/run.md).
  // Only delete files the user hasn't edited (installedHash matches) to avoid data loss.
  const currentRelPaths = new Set(fileItems.map((it) => it.rel));
  for (const [rel, meta] of Object.entries(manifest.files || {})) {
    if (currentRelPaths.has(rel)) continue; // still in the source → keep
    const dest = path.join(base, rel);
    if (!fs.existsSync(dest)) {
      delete newManifestFiles[rel]; // file is already gone, clean up the manifest
      continue;
    }
    const destHash = sha256(dest);
    if (meta.installedHash && destHash === meta.installedHash) {
      // User hasn't edited it → safe to delete
      console.log(`  ${c.yellow('remove  ')} ${c.dim(rel)} ${c.dim('(path changed in the new repo)')}`);
      if (!opts.dryRun) fs.unlinkSync(dest);
      delete newManifestFiles[rel];
    } else {
      // User has edited it → warn, don't delete
      console.log(`  ${c.dim('obsolete')} ${c.dim(rel)} ${c.yellow('← you edited this file; delete it manually if unneeded')}`);
    }
  }

  // 4) Hook registration
  if (hookPlan) {
    if (hookPlan.changed) {
      console.log(`  ${c.green('settings')} ${c.dim(path.relative(base, hookPlan.settingsPath) + ' ← registered the SessionStart hook')}`);
      if (!opts.dryRun) hookPlan.write();
    } else {
      console.log(c.dim(`  settings  hook already registered — skipping`));
    }
  }

  // 5) CLAUDE.md managed block
  if (claudeMdPlan) {
    if (claudeMdPlan.changed) {
      const verb = claudeMdPlan.isNew ? 'created' : 'block updated';
      console.log(`  ${c.green('claude-md')} ${c.dim(claudeMdPlan.dest + ' ← ' + verb)}`);
      if (!opts.dryRun) claudeMdPlan.write();
    } else {
      console.log(c.dim(`  claude-md CLAUDE.md already has the latest block — skipping`));
    }
  }

  // 6) Save the manifest
  if (!opts.dryRun) {
    saveManifest(base, {
      plugin: PLUGIN_NAME,
      version: PLUGIN_VERSION,
      installedAt: new Date().toISOString(),
      target: target.mode,
      components,
      files: newManifestFiles,
    });
  }

  // 7) Summary
  printSummary(counts, opts, base, target);
}

function bulkMap(ch) {
  return ch === 'O' ? 'overwrite' : ch === 'S' ? 'skip' : 'backup';
}

async function askConflict(prompter, item) {
  console.log(`\n  ${c.yellow('⚠ conflict')} ${c.bold(item.rel)} ${c.dim('(you edited this file, or it already existed)')}`);
  while (true) {
    const ans = (await prompter.ask(
      `    [o]verwrite  [s]kip  [b]ackup+overwrite  [d]iff  ${c.dim('| uppercase = apply to all:')} [O/S/B]  → `
    )) || 's';
    switch (ans) {
      case 'o': return 'overwrite';
      case 's': return 'skip';
      case 'b': return 'backup';
      case 'd': showDiff(item.dest, item.src); break;
      case 'O': return 'bulk:O';
      case 'S': return 'bulk:S';
      case 'B': return 'bulk:B';
      default: console.log(c.dim('    Enter o / s / b / d / O / S / B'));
    }
  }
}

async function applyConflict(decision, item, opts, counts, manifestFiles) {
  const tag = c.dim(item.rel);
  if (decision === 'skip') {
    counts.skipped++;
    console.log(`  ${c.yellow('skip    ')} ${tag}`);
    return; // keep the old manifest entry (if any)
  }
  if (decision === 'backup') {
    counts.backup++;
    let bakName = '';
    if (!opts.dryRun) bakName = path.basename(backupFile(item.dest));
    console.log(`  ${c.green('backup  ')} ${tag} ${c.dim('→ ' + (bakName || item.rel + '.bak') + ' then overwritten')}`);
    if (!opts.dryRun) writeFile(item.dest, item.src);
    manifestFiles[item.rel] = { installedHash: item.srcHash };
    return;
  }
  // overwrite
  counts.update++;
  console.log(`  ${c.green('overwrite')} ${tag}`);
  if (!opts.dryRun) writeFile(item.dest, item.src);
  manifestFiles[item.rel] = { installedHash: item.srcHash };
}

function printSummary(counts, opts, base, target) {
  console.log('');
  const parts = [];
  if (counts.install) parts.push(c.green(`${counts.install} installed`));
  if (counts.update) parts.push(c.green(`${counts.update} updated`));
  if (counts.backup) parts.push(c.cyan(`${counts.backup} backed up+overwritten`));
  if (counts.skipped) parts.push(c.yellow(`${counts.skipped} skipped`));
  if (counts['up-to-date']) parts.push(c.dim(`${counts['up-to-date']} already up to date`));
  console.log(c.bold('Result: ') + (parts.length ? parts.join(c.dim(' · ')) : c.dim('nothing changed')));

  if (opts.dryRun) {
    console.log(c.yellow('\nThis was a DRY-RUN — nothing was written. Drop --dry-run to install for real.'));
    return;
  }
  console.log(c.dim(`Manifest: ${path.join(base, MANIFEST_NAME)}`));
  if (target.mode === 'project') {
    console.log('\nDone. Open Claude Code in this project to use ' + c.cyan('/sdlc:*') + '.');
  } else {
    console.log('\nDone.');
  }
}

// ---------------------------------------------------------------------------

function fail(msg) {
  console.error(c.red('Error: ') + msg);
  process.exit(1);
}

main().catch((err) => {
  console.error(c.red('\nInstaller failed:'), err && err.stack ? err.stack : err);
  process.exit(1);
});
