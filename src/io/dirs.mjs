import fs from 'node:fs/promises';
import path from 'node:path';

async function ensureDir(targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
}

async function cleanDir(targetDir, options = {}) {
  const { preserveRoot = true } = options;
  await ensureDir(targetDir);
  const entries = await fs.readdir(targetDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await cleanDir(fullPath, { preserveRoot: false });
      continue;
    }

    if (entry.name === '.gitkeep') {
      continue;
    }

    await fs.rm(fullPath, { force: true });
  }

  if (!preserveRoot) {
    try {
      const remainingEntries = await fs.readdir(targetDir);

      if (remainingEntries.length === 0) {
        await fs.rmdir(targetDir);
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

export {
  cleanDir,
  ensureDir,
};
