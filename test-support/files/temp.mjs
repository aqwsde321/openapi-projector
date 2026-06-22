import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

async function createTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function withTempDir(prefix, callback) {
  const workspace = await createTempDir(prefix);
  try {
    return await callback(workspace);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

export { createTempDir, withTempDir };
