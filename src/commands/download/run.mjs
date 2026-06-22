import { formatSuccess } from '../../cli/format.mjs';
import { resolveOpenApiSourcePath } from '../../config/project-paths.mjs';
import { loadProjectConfig } from '../../core/project-workspace.mjs';
import { writeText } from '../../io/files.mjs';

async function runDownload(rootDir) {
  const { projectConfig } = await loadProjectConfig(rootDir);

  const sourceUrl = projectConfig.sourceUrl;
  const outputPath = resolveOpenApiSourcePath(rootDir, projectConfig);

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

  console.log(formatSuccess(`Downloaded OpenAPI spec to ${outputPath}`));
}

export { runDownload };
