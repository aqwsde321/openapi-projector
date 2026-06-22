import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

async function assertExists(filePath) {
  await fs.access(filePath);
}

async function assertAllExist(filePaths) {
  await Promise.all(filePaths.map(assertExists));
}

async function assertMissing(filePath) {
  await assert.rejects(() => fs.access(filePath), /ENOENT/);
}

async function assertAllMissing(filePaths) {
  await Promise.all(filePaths.map(assertMissing));
}

export { assertAllExist, assertAllMissing, assertExists, assertMissing };
