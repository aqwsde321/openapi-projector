#!/usr/bin/env node

import { formatFailure } from '../src/cli/format.mjs';
import { runCli } from '../src/cli/run.mjs';

try {
  await runCli(process.argv.slice(2));
} catch (error) {
  console.error(formatFailure(error?.message ?? String(error), process.stderr));
  process.exitCode = 1;
}
