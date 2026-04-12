import path from 'node:path';

import {
  loadProjectConfig,
  writeText,
} from '../core/openapi-utils.mjs';

const downloadCommand = {
  name: 'download',
  async run() {
    const rootDir = process.cwd();
    const { projectConfig } = await loadProjectConfig(rootDir);

    const sourceUrl = projectConfig.sourceUrl;
    const outputPath = path.resolve(rootDir, projectConfig.sourcePath);

    if (!sourceUrl || sourceUrl.includes('example.com')) {
      throw new Error(
        'sourceUrl is not configured.\nUpdate project config first, then run download again.',
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
