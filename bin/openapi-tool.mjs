#!/usr/bin/env node

import { runCli } from '../src/cli.mjs';
import { formatFailure } from '../src/cli-format.mjs';

try {
  await runCli(process.argv.slice(2));
} catch (error) {
  console.error(formatFailure(error?.message ?? String(error), process.stderr));
  process.exitCode = 1;
}
