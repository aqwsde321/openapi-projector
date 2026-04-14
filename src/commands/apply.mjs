import fs from 'node:fs/promises';
import path from 'node:path';

import { cleanDir, ensureDir, loadProjectConfig, readJson } from '../core/openapi-utils.mjs';

const applyCommand = {
  name: 'apply',
  async run(options = {}) {
    const context = Array.isArray(options) ? {} : (options.context ?? {});
    const rootDir = context.targetRoot ?? process.cwd();
    const { projectConfig } = await loadProjectConfig(rootDir);
    const applyTargetSrcDir = path.resolve(rootDir, projectConfig.applyTargetSrcDir);
    const projectGeneratedSrcDir = path.resolve(rootDir, projectConfig.projectGeneratedSrcDir);
    const projectRootDir = path.resolve(projectGeneratedSrcDir, '..', '..');
    const projectManifestPath = path.join(projectRootDir, 'manifest.json');

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
      if (!entry.generated || !entry.target) {
        throw new Error(`Invalid manifest entry: ${JSON.stringify(entry)}`);
      }

      const sourceFilePath = path.resolve(rootDir, entry.generated);
      const targetFilePath = path.resolve(rootDir, entry.target);

      await ensureDir(path.dirname(targetFilePath));
      await fs.copyFile(sourceFilePath, targetFilePath);
    }

    console.log(
      `Applied ${projectManifest.files?.length ?? 0} file(s) from ${projectGeneratedSrcDir} to ${applyTargetSrcDir}`,
    );
  },
};

export { applyCommand };
