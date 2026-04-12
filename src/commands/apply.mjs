import fs from 'node:fs/promises';
import path from 'node:path';

import {
  cleanDir,
  ensureDir,
  loadProjectConfig,
  readJson,
} from '../core/openapi-utils.mjs';

const applyCommand = {
  name: 'apply',
  async run() {
    const rootDir = process.cwd();
    const { projectConfig } = await loadProjectConfig(rootDir);

    const projectGeneratedSrcDir = path.resolve(
      rootDir,
      projectConfig.projectGeneratedSrcDir,
    );
    const applyTargetSrcDir = path.resolve(rootDir, projectConfig.applyTargetSrcDir);
    const projectManifestPath = path.resolve(
      rootDir,
      path.join(path.dirname(projectConfig.projectGeneratedSrcDir), '..', 'manifest.json'),
    );

    let projectManifest;

    try {
      projectManifest = await readJson(projectManifestPath);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        throw new Error(
          `Project manifest not found: ${projectManifestPath}\nRun openapi-tool project first.`,
        );
      }
      throw error;
    }

    await ensureDir(applyTargetSrcDir);
    await cleanDir(applyTargetSrcDir);

    for (const entry of projectManifest.files ?? []) {
      for (const [generatedKey, targetKey] of [
        ['dto', 'dto'],
        ['api', 'api'],
      ]) {
        const sourceFilePath = path.resolve(rootDir, entry.generated?.[generatedKey] ?? '');
        const targetFilePath = path.resolve(rootDir, entry.target?.[targetKey] ?? '');

        await ensureDir(path.dirname(targetFilePath));
        await fs.copyFile(sourceFilePath, targetFilePath);
      }
    }

    console.log(`Applied project candidates from ${projectGeneratedSrcDir} to ${applyTargetSrcDir}`);
  },
};

export { applyCommand };
