import path from 'node:path';

import {
  loadProjectConfig,
  writeText,
} from '../core/openapi-utils.mjs';

const downloadCommand = {
  name: 'download',
  async run(options = {}) {
    const context = Array.isArray(options) ? {} : (options.context ?? {});
    const rootDir = context.targetRoot ?? process.cwd();
    const { projectConfig } = await loadProjectConfig(rootDir);

    const sourceUrl = projectConfig.sourceUrl;
    const outputPath = path.resolve(rootDir, projectConfig.sourcePath);

    if (!sourceUrl || sourceUrl.includes('example.com')) {
      throw new Error(
        'sourceUrl is not configured.\nSet sourceUrl in openapi/config/project.jsonc, then run download again.',
      );
    }

    const response = await fetch(sourceUrl);

    if (!response.ok) {
      throw new Error(`OpenAPI download failed: ${response.status} ${response.statusText}`);
    }

    const body = await response.text();
    await writeText(outputPath, body.endsWith('\n') ? body : `${body}\n`);

    console.log(`Downloaded OpenAPI spec to ${outputPath}`);
  },
};

export { downloadCommand };
