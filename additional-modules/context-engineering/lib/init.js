import { copyFile, mkdir, readFile, writeFile, readdir } from 'fs/promises';
import { resolve, relative } from 'path';
import { existsSync } from 'fs';
import { execSync, spawnSync } from 'child_process';

const SCRIPT_NAMES = ['measure_context.py', 'render_memory.py', 'check_gate.py'];

async function copyFileWithSubstitution(src, dest, rootDir, vars) {
  const content = await readFile(src, 'utf8');
  const substituted = content.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] || match);
  await writeFile(dest, substituted);
  log(`  ✓ ${relative(rootDir, dest)}`);
}

async function copyDir(src, dest, rootDir, vars = {}) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = resolve(src, entry.name);
    const destPath = resolve(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, rootDir, vars);
    } else if (entry.name.endsWith('.template') || entry.name.includes('.template.')) {
      const destName = entry.name.replace('.template', '').replace('.template.', '.');
      const cleanDest = resolve(dest, destName);
      await copyFileWithSubstitution(srcPath, cleanDest, rootDir, vars);
    } else {
      await copyFile(srcPath, destPath);
      log(`  ✓ ${relative(rootDir, destPath)}`);
    }
  }
}

function log(msg) {
  process.stdout.write(msg + '\n');
}

async function dirIsEmpty(dir) {
  if (!existsSync(dir)) return true;
  const entries = await readdir(dir);
  return entries.length === 0;
}

function getGitInfo() {
  try {
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    return { branch, commit };
  } catch {
    return { branch: 'main', commit: 'unknown' };
  }
}

async function resolvePlaceholdersInFile(filePath, vars, labelRoot) {
  if (!existsSync(filePath)) return false;
  const content = await readFile(filePath, 'utf8');
  if (!content.includes('{{')) return false;
  const substituted = content.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match);
  await writeFile(filePath, substituted);
  log(`  ✓ resolved placeholders in ${relative(labelRoot, filePath)}`);
  return true;
}

async function syncScripts(templatesRoot, scriptsDir, labelRoot) {
  const srcDir = resolve(templatesRoot, 'scripts');
  await mkdir(scriptsDir, { recursive: true });
  for (const name of SCRIPT_NAMES) {
    const src = resolve(srcDir, name);
    if (!existsSync(src)) continue;
    await copyFile(src, resolve(scriptsDir, name));
    log(`  ✓ synced ${relative(labelRoot, resolve(scriptsDir, name))}`);
  }
}

function runRenderMemory(projectRoot) {
  const script = resolve(projectRoot, 'additional-modules/scripts/render_memory.py');
  if (!existsSync(script)) {
    log('  ⚠ render_memory.py not found — skipping MEMORY.md generation');
    return;
  }
  const state = resolve(projectRoot, 'additional-modules/buildplan/agent_state.json');
  if (!existsSync(state)) {
    log('  ⚠ agent_state.json not found — skipping MEMORY.md generation');
    return;
  }
  const result = spawnSync('python3', [script], { cwd: projectRoot, encoding: 'utf8' });
  if (result.status === 0) {
    log('  ✓ regenerated MEMORY.md');
  } else {
    log(`  ⚠ render_memory.py failed: ${result.stderr || result.stdout}`);
  }
}

async function init(projectRoot, templatesRoot, buildplanRoot, phaseBuilderRoot, workLogRoot, options = {}) {
  const force = Boolean(options.force);
  log('🚀 Initializing context engineering...\n');

  const { branch, commit } = getGitInfo();
  const today = new Date().toISOString().split('T')[0];

  const vars = {
    DATE: today,
    BRANCH: branch,
    COMMIT: commit,
    TOKEN_LIMIT: '28,000'
  };

  const additionalModules = resolve(projectRoot, 'additional-modules');
  const buildplanDir = resolve(additionalModules, 'buildplan');
  const scriptsDir = resolve(additionalModules, 'scripts');
  const workLogDir = resolve(additionalModules, 'work-log');

  if ((await dirIsEmpty(buildplanDir)) || force) {
    log('Setting up additional-modules/buildplan/');
    await copyDir(buildplanRoot, buildplanDir, additionalModules, vars);
    log('');
  } else {
    log('ℹ️  additional-modules/buildplan/ already present — resolving placeholders');
    await resolvePlaceholdersInFile(resolve(buildplanDir, 'agent_state.json'), vars, projectRoot);
    await resolvePlaceholdersInFile(resolve(buildplanDir, 'context_budget.json'), vars, projectRoot);
    log('');
  }

  log('Syncing additional-modules/scripts/ (always updates Python tooling)');
  await syncScripts(templatesRoot, scriptsDir, projectRoot);
  log('');

  if ((await dirIsEmpty(workLogDir)) || force) {
    log('Setting up additional-modules/work-log/');
    await copyDir(workLogRoot, workLogDir, additionalModules);
    log('');
  } else {
    log('ℹ️  additional-modules/work-log/ already present — skipping structure copy');
    log('');
  }

  const agentsMd = resolve(projectRoot, 'AGENTS.md');
  if (!existsSync(agentsMd) || force) {
    const template = await readFile(resolve(templatesRoot, 'AGENTS.md.template'), 'utf8');
    await writeFile(agentsMd, template);
    log(`  ✓ ${force && existsSync(agentsMd) ? 'updated' : 'created'} AGENTS.md`);
    log('');
  } else {
    log('ℹ️  AGENTS.md already exists (use --force to overwrite)');
    log('');
  }

  log('Regenerating MEMORY.md from agent_state.json');
  runRenderMemory(projectRoot);
  log('');

  if (options.opencode) {
    const opencodeDest = resolve(additionalModules, 'context-engineering', 'opencode.json');
    const opencodeTemplate = resolve(templatesRoot, 'opencode.json.template');
    if (!existsSync(opencodeTemplate)) {
      log('⚠ opencode.json.template not found in package — skipping OpenCode config');
      log('');
    } else if (existsSync(opencodeDest) && !force) {
      log('ℹ️  additional-modules/context-engineering/opencode.json already present (use --force to overwrite)');
      log('');
    } else {
      log(`${force && existsSync(opencodeDest) ? 'Updating' : 'Creating'} additional-modules/context-engineering/opencode.json`);
      await copyFileWithSubstitution(opencodeTemplate, opencodeDest, projectRoot, vars);
      log('');
    }
  }

  if (options.phaseBuilder && phaseBuilderRoot && existsSync(phaseBuilderRoot)) {
    const phaseDest = resolve(additionalModules, 'phase_builder');
    if ((await dirIsEmpty(phaseDest)) || force) {
      log('Setting up additional-modules/phase_builder/');
      await copyDir(phaseBuilderRoot, phaseDest, additionalModules);
      log('');
    } else {
      log('ℹ️  additional-modules/phase_builder/ already present (use --force to overwrite)');
      log('');
    }
  } else if (options.phaseBuilder) {
    log('⚠ phase-builder source not found in package — skipping phase_builder/');
    log('');
  }

  log('✅ Context engineering initialized!\n');
  log('Next steps:');
  log('  1. python3 additional-modules/scripts/measure_context.py --tokens 0 --start-session');
  log('  2. Edit additional-modules/buildplan/agent_state.json for your project');
  log('  3. python3 additional-modules/scripts/render_memory.py');
  log('  4. python3 additional-modules/scripts/measure_context.py --status');
  let step = 5;
  if (!options.opencode) {
    log(`  ${step}. node additional-modules/context-engineering/bin/context-eng.js init --opencode  (OpenCode users)`);
    step += 1;
  } else {
    log(`  ${step}. Set provider model limits in additional-modules/context-engineering/opencode.json (see README)`);
    step += 1;
  }
  if (options.phaseBuilder) {
    log(`  ${step}. cd additional-modules/phase-builder && python3 -m venv .venv && .venv/bin/pip install pytest && .venv/bin/pytest`);
  }
}

export { init };
