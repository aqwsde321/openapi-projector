import fs from 'node:fs/promises';
import path from 'node:path';

import { readTextFile } from '#test-support/files/io.mjs';
import { withTempDir } from '#test-support/files/temp.mjs';

const PROJECT_OUTPUT_TEMP_PREFIX = 'openapi-projector-unit-';
const PROJECT_OUTPUT_SNAPSHOT_TEMP_PREFIX = 'openapi-projector-snapshot-';

function withTempProjectOutput(callback) {
  return withTempDir(PROJECT_OUTPUT_TEMP_PREFIX, callback);
}

function withTempProjectOutputSnapshot(callback) {
  return withTempDir(PROJECT_OUTPUT_SNAPSHOT_TEMP_PREFIX, callback);
}

async function collectProjectOutputFiles(rootDir, currentDir = rootDir) {
  const files = {};
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      Object.assign(files, await collectProjectOutputFiles(rootDir, fullPath));
      continue;
    }

    if (entry.isFile()) {
      files[path.relative(rootDir, fullPath).replaceAll(path.sep, '/')] =
        await readTextFile(fullPath);
    }
  }

  return Object.fromEntries(
    Object.entries(files).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function normalizeGeneratedTimestamps(value) {
  return value.replace(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g,
    '<generatedAt>',
  );
}

async function readNormalizedProjectOutputFile(filePath) {
  return normalizeGeneratedTimestamps(await readTextFile(filePath));
}

export {
  collectProjectOutputFiles,
  normalizeGeneratedTimestamps,
  readNormalizedProjectOutputFile,
  withTempProjectOutput,
  withTempProjectOutputSnapshot,
};
