#!/usr/bin/env node
/**
 * SDLC Workflow — installer.
 *
 * Copy tài nguyên (agents / commands / skills / hooks / CLAUDE.md) từ repo này
 * sang thư mục .claude của DỰ ÁN ĐÍCH. Thiết kế để chạy online, ví dụ:
 *
 *   npx github:hoangkhoanguyen/claude-tools            # cài vào ./.claude của dự án hiện tại
 *   npx github:hoangkhoanguyen/claude-tools --global   # cài vào ~/.claude
 *
 * Đặc điểm:
 *   - Zero-dependency (chỉ dùng built-in Node) → npx chạy nhanh, không cài thêm gì.
 *   - Idempotent: chạy lại sau khi update repo chỉ ghi đè file mà user CHƯA sửa;
 *     file user đã sửa thì hỏi (nhờ manifest .sdlc-install.json ghi checksum lúc cài).
 *   - Merge an toàn cho settings.json (hooks) và CLAUDE.md (managed block) — không đè mù.
 *   - Chọn lọc thành phần, dry-run, backup, hỏi từng file.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const readline = require('readline');
const { spawnSync } = require('child_process');

// ---------------------------------------------------------------------------
// Hằng số & metadata
// ---------------------------------------------------------------------------

const SRC_ROOT = path.resolve(__dirname, '..');
const PKG = readJsonSafe(path.join(SRC_ROOT, 'package.json')) || {};
const PLUGIN_NAME = PKG.name || 'sdlc-workflow';
const PLUGIN_VERSION = PKG.version || '0.0.0';
const MANIFEST_NAME = '.sdlc-install.json';
const HOOK_SCRIPT = 'sdlc-session-start.sh';
const CLAUDE_MD_START = '<!-- sdlc-workflow:start (managed — đừng sửa tay trong block này) -->';
const CLAUDE_MD_END = '<!-- sdlc-workflow:end -->';

// Thành phần cài được. `dir` = thư mục nguồn; `type` quyết định cách xử lý.
const COMPONENTS = {
  agents:    { type: 'files', dir: 'agents',   label: 'Custom agents' },
  commands:  { type: 'files', dir: 'commands', label: 'Slash commands (/sdlc:*)' },
  skills:    { type: 'files', dir: 'skills',   label: 'Skills' },
  templates: { type: 'files', dir: 'templates', label: 'Templates (state/context template — commands tham chiếu)' },
  hooks:     { type: 'hooks', dir: 'hooks',    label: 'SessionStart hook + đăng ký vào settings.json' },
  'claude-md': { type: 'claude-md',            label: 'Nguyên tắc SDLC (managed block trong CLAUDE.md)' },
};
const DEFAULT_COMPONENTS = ['agents', 'commands', 'skills', 'templates', 'hooks'];

// ---------------------------------------------------------------------------
// Tô màu terminal (tự tắt khi không phải TTY hoặc NO_COLOR)
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
// Parse tham số dòng lệnh
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
        else fail(`Tham số không hợp lệ: ${a} (chạy --help để xem hướng dẫn)`);
    }
  }
  if (!['ask', 'overwrite', 'skip', 'backup'].includes(opts.onConflict)) {
    fail(`--on-conflict phải là ask|overwrite|skip|backup (nhận: ${opts.onConflict})`);
  }
  return opts;
}

function splitList(s) {
  return String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Tiện ích fs / hash / json
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
// Xác định thư mục đích
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
// Thu thập danh sách file cần cài theo thành phần
// ---------------------------------------------------------------------------

function collectFiles(componentKeys, base) {
  // Trả về mảng { component, src, dest, rel } cho các thành phần dạng 'files'/'hooks'.
  const items = [];
  for (const key of componentKeys) {
    const comp = COMPONENTS[key];
    if (!comp || (comp.type !== 'files' && comp.type !== 'hooks')) continue;
    const srcDir = path.join(SRC_ROOT, comp.dir);
    for (const src of walk(srcDir)) {
      const relInDir = path.relative(srcDir, src);
      // hooks.json là format của plugin (${CLAUDE_PLUGIN_ROOT}); ở target ta
      // đăng ký hook qua settings.json nên bỏ qua file này khi copy.
      if (key === 'hooks' && relInDir === 'hooks.json') continue;
      const rel = path.join(comp.dir, relInDir); // ví dụ: agents/architect.md
      items.push({ component: key, src, dest: path.join(base, rel), rel });
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// Quyết định hành động cho 1 file thường
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
    // User chưa đụng vào file kể từ lần cài trước → update an toàn.
    return { ...item, action: 'update', srcHash };
  }
  // dest tồn tại, khác src, và user đã sửa (hoặc chưa từng cài) → xung đột.
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
// Ghi file + backup
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
// Diff (dùng lệnh diff hệ thống nếu có)
// ---------------------------------------------------------------------------

function showDiff(dest, src) {
  const r = spawnSync('diff', ['-u', dest, src], { encoding: 'utf8' });
  if (r.error) {
    console.log(c.dim('  (không tìm thấy lệnh `diff` trên máy — bỏ qua)'));
    return;
  }
  const body = (r.stdout || '').split('\n').slice(0, 60).join('\n');
  console.log(c.dim(body || '  (không có khác biệt hiển thị)'));
  if ((r.stdout || '').split('\n').length > 60) console.log(c.dim('  … (đã cắt bớt)'));
}

// ---------------------------------------------------------------------------
// Merge hook vào settings.json của target
// ---------------------------------------------------------------------------

function hookCommandFor(target, base) {
  const scriptPath = path.join(base, 'hooks', HOOK_SCRIPT);
  // Project cài vào ./.claude → dùng $CLAUDE_PROJECT_DIR cho portable (commit được).
  if (target.mode === 'project' && base === path.join(process.cwd(), '.claude')) {
    return `bash "$CLAUDE_PROJECT_DIR/.claude/hooks/${HOOK_SCRIPT}"`;
  }
  // Global / custom → path tuyệt đối.
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
  // Xoá mọi entry SDLC cũ (nhận diện qua tên script) để idempotent, rồi thêm mới.
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
// Merge CLAUDE.md (managed block)
// ---------------------------------------------------------------------------

function claudeMdTargetPath(target, base) {
  // Nguyên tắc SDLC nên nằm ở CLAUDE.md mà Claude Code đọc:
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
  const re = new RegExp(
    `${escapeRe(CLAUDE_MD_START)}[\\s\\S]*?${escapeRe(CLAUDE_MD_END)}`,
    'm'
  );
  if (re.test(current)) {
    next = current.replace(re, block); // update block cũ
  } else {
    next = current
      ? current.replace(/\s*$/, '') + `\n\n${block}\n`
      : `${block}\n`; // append vào cuối, hoặc tạo mới
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

Cài agents / commands / skills / hooks vào .claude của dự án đích.

${c.bold('Dùng:')}
  npx github:hoangkhoanguyen/claude-tools [options]

${c.bold('Đích cài (mặc định: ./.claude của dự án hiện tại):')}
  -g, --global            Cài vào ~/.claude (dùng cho mọi dự án)
      --dir <path>        Cài vào .claude tại thư mục chỉ định

${c.bold('Chọn thành phần:')}
      --only a,b,c        Chỉ cài các thành phần này
      --skip a,b,c        Cài tất cả trừ các thành phần này
      --list              Liệt kê thành phần rồi thoát
  ${c.dim('Thành phần: ' + Object.keys(COMPONENTS).join(', '))}
  ${c.dim('Mặc định:   ' + DEFAULT_COMPONENTS.join(', ') + '  (claude-md phải bật thủ công qua --only)')}

${c.bold('Xử lý xung đột khi file đã tồn tại:')}
      --on-conflict ask       Hỏi từng file (mặc định khi có bàn phím)
      --on-conflict overwrite Ghi đè (alias: --force)
      --on-conflict skip      Giữ nguyên file của bạn
      --on-conflict backup    Backup .bak rồi ghi đè
  ${c.dim('File bạn CHƯA sửa kể từ lần cài trước luôn được update tự động, không hỏi.')}

${c.bold('Khác:')}
  -n, --dry-run           Chỉ hiển thị sẽ làm gì, không ghi gì
  -y, --yes               Không hỏi (non-TTY tự dùng --on-conflict backup)
  -v, --version           In version
  -h, --help              Trợ giúp

${c.bold('Repo private:')} đặt GITHUB_TOKEN trong môi trường trước khi chạy npx,
hoặc dùng: npx git+https://<token>@github.com/owner/repo
`);
}

function printList() {
  console.log(c.bold('\nThành phần cài được:\n'));
  for (const [key, comp] of Object.entries(COMPONENTS)) {
    const def = DEFAULT_COMPONENTS.includes(key) ? c.green(' [mặc định]') : c.dim(' [opt-in]');
    console.log(`  ${c.cyan(key.padEnd(11))} ${comp.label}${def}`);
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// Chọn danh sách thành phần
// ---------------------------------------------------------------------------

function resolveComponents(opts) {
  let keys = opts.only ? opts.only.slice() : DEFAULT_COMPONENTS.slice();
  for (const k of keys) {
    if (!COMPONENTS[k]) fail(`Thành phần không tồn tại: ${k} (xem --list)`);
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

  // Non-TTY mà để 'ask' → không thể hỏi, chuyển sang backup (an toàn, không mất dữ liệu).
  const interactive = process.stdin.isTTY && process.stdout.isTTY && !opts.yes;
  if (opts.onConflict === 'ask' && !interactive) {
    opts.onConflict = 'backup';
  }

  console.log(c.bold(`\n${PLUGIN_NAME} v${PLUGIN_VERSION}`));
  console.log(`Đích:        ${c.cyan(base)} ${c.dim('(' + target.mode + ')')}`);
  console.log(`Thành phần:  ${c.cyan(components.join(', '))}`);
  console.log(`Xung đột:    ${c.cyan(opts.onConflict)}${opts.dryRun ? c.yellow('   [DRY-RUN]') : ''}\n`);

  const manifest = loadManifest(base);

  // 1) Lập kế hoạch cho các file thường (agents/commands/skills/hooks scripts)
  const fileItems = collectFiles(components, base).map((it) => decideFile(it, manifest));

  // 2) Kế hoạch cho hook registration & claude-md
  const hookPlan = components.includes('hooks') ? planHookRegistration(target, base) : null;
  const claudeMdPlan = components.includes('claude-md') ? planClaudeMd(target, base) : null;

  // Đếm nhanh
  const counts = { install: 0, update: 0, 'up-to-date': 0, conflict: 0, skipped: 0, backup: 0 };

  const prompter = interactive ? makePrompter() : null;
  let bulkChoice = null; // 'O'|'S'|'B' áp cho mọi conflict còn lại

  const newManifestFiles = { ...(manifest.files || {}) };

  // 3) Thực thi từng file
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
      continue; // im lặng
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

  // 3b) Dọn file cũ (obsolete): có trong manifest trước nhưng không còn trong source.
  // Xảy ra khi repo đổi cấu trúc (vd: commands/run.md → commands/sdlc/run.md).
  // Chỉ xóa file mà user chưa sửa (installedHash khớp) để tránh mất dữ liệu.
  const currentRelPaths = new Set(fileItems.map((it) => it.rel));
  for (const [rel, meta] of Object.entries(manifest.files || {})) {
    if (currentRelPaths.has(rel)) continue; // còn trong source → giữ
    const dest = path.join(base, rel);
    if (!fs.existsSync(dest)) {
      delete newManifestFiles[rel]; // file đã mất tự nhiên, dọn manifest
      continue;
    }
    const destHash = sha256(dest);
    if (meta.installedHash && destHash === meta.installedHash) {
      // User chưa sửa → xóa an toàn
      console.log(`  ${c.yellow('remove  ')} ${c.dim(rel)} ${c.dim('(đã đổi path trong repo mới)')}`);
      if (!opts.dryRun) fs.unlinkSync(dest);
      delete newManifestFiles[rel];
    } else {
      // User đã sửa → cảnh báo, không xóa
      console.log(`  ${c.dim('obsolete')} ${c.dim(rel)} ${c.yellow('← bạn đã sửa file này; xóa tay nếu không cần')}`);
    }
  }

  // 4) Hook registration
  if (hookPlan) {
    if (hookPlan.changed) {
      console.log(`  ${c.green('settings')} ${c.dim(path.relative(base, hookPlan.settingsPath) + ' ← đăng ký SessionStart hook')}`);
      if (!opts.dryRun) hookPlan.write();
    } else {
      console.log(c.dim(`  settings  hooks đã đăng ký sẵn — bỏ qua`));
    }
  }

  // 5) CLAUDE.md managed block
  if (claudeMdPlan) {
    if (claudeMdPlan.changed) {
      const verb = claudeMdPlan.isNew ? 'tạo' : 'cập nhật block';
      console.log(`  ${c.green('claude-md')} ${c.dim(claudeMdPlan.dest + ' ← ' + verb)}`);
      if (!opts.dryRun) claudeMdPlan.write();
    } else {
      console.log(c.dim(`  claude-md CLAUDE.md đã có block mới nhất — bỏ qua`));
    }
  }

  // 6) Lưu manifest
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

  // 7) Tổng kết
  printSummary(counts, opts, base, target);
}

function bulkMap(ch) {
  return ch === 'O' ? 'overwrite' : ch === 'S' ? 'skip' : 'backup';
}

async function askConflict(prompter, item) {
  console.log(`\n  ${c.yellow('⚠ xung đột')} ${c.bold(item.rel)} ${c.dim('(bạn đã sửa file này, hoặc nó có sẵn từ trước)')}`);
  while (true) {
    const ans = (await prompter.ask(
      `    [o]verwrite  [s]kip  [b]ackup+overwrite  [d]iff  ${c.dim('| viết hoa = áp cho tất cả:')} [O/S/B]  → `
    )) || 's';
    switch (ans) {
      case 'o': return 'overwrite';
      case 's': return 'skip';
      case 'b': return 'backup';
      case 'd': showDiff(item.dest, item.src); break;
      case 'O': return 'bulk:O';
      case 'S': return 'bulk:S';
      case 'B': return 'bulk:B';
      default: console.log(c.dim('    Nhập o / s / b / d / O / S / B'));
    }
  }
}

async function applyConflict(decision, item, opts, counts, manifestFiles) {
  const tag = c.dim(item.rel);
  if (decision === 'skip') {
    counts.skipped++;
    console.log(`  ${c.yellow('skip    ')} ${tag}`);
    return; // giữ manifest cũ (nếu có)
  }
  if (decision === 'backup') {
    counts.backup++;
    let bakName = '';
    if (!opts.dryRun) bakName = path.basename(backupFile(item.dest));
    console.log(`  ${c.green('backup  ')} ${tag} ${c.dim('→ ' + (bakName || item.rel + '.bak') + ' rồi ghi đè')}`);
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
  if (counts.install) parts.push(c.green(`${counts.install} cài mới`));
  if (counts.update) parts.push(c.green(`${counts.update} cập nhật`));
  if (counts.backup) parts.push(c.cyan(`${counts.backup} backup+ghi đè`));
  if (counts.skipped) parts.push(c.yellow(`${counts.skipped} bỏ qua`));
  if (counts['up-to-date']) parts.push(c.dim(`${counts['up-to-date']} đã mới nhất`));
  console.log(c.bold('Kết quả: ') + (parts.length ? parts.join(c.dim(' · ')) : c.dim('không có gì thay đổi')));

  if (opts.dryRun) {
    console.log(c.yellow('\nĐây là DRY-RUN — chưa ghi gì. Bỏ --dry-run để cài thật.'));
    return;
  }
  console.log(c.dim(`Manifest: ${path.join(base, MANIFEST_NAME)}`));
  if (target.mode === 'project') {
    console.log('\nXong. Mở Claude Code trong dự án này để dùng ' + c.cyan('/sdlc:*') + '.');
  } else {
    console.log('\nXong.');
  }
}

// ---------------------------------------------------------------------------

function fail(msg) {
  console.error(c.red('Lỗi: ') + msg);
  process.exit(1);
}

main().catch((err) => {
  console.error(c.red('\nInstaller lỗi:'), err && err.stack ? err.stack : err);
  process.exit(1);
});
