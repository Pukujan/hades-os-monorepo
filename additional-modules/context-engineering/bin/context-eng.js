#!/usr/bin/env node

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { init } from '../lib/init.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = resolve(__dirname, '..', 'templates');
const BUILDPPLAN = resolve(__dirname, '..', '..', 'buildplan');
const PHASE_BUILDER = resolve(__dirname, '..', '..', 'phase-builder', 'phase_builder');
const WORK_LOG = resolve(__dirname, '..', '..', 'work-log');

const projectRoot = process.cwd();

const command = process.argv[2] || 'init';
const options = {
  phaseBuilder: process.argv.includes('--phase-builder'),
  opencode: process.argv.includes('--opencode'),
  force: process.argv.includes('--force')
};

if (command === 'init') {
  await init(projectRoot, TEMPLATES, BUILDPPLAN, options.phaseBuilder ? PHASE_BUILDER : null, WORK_LOG, options);
} else {
  console.error(`Unknown command: ${command}`);
  console.error('Usage: context-engineering init [--phase-builder] [--opencode] [--force]');
  process.exit(1);
}
