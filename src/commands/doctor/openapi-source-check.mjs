import {
  resolveOpenApiSourcePath,
} from '../../config/project-paths.mjs';
import { pathExists } from '../../io/files.mjs';
import { loadSupportedOpenApiSpec } from '../../openapi/load-spec.mjs';
import { toDoctorRelativePath } from './workspace-helpers.mjs';

async function checkDownloadedOpenApiSource(rootDir, projectConfig, { fail, lines, pass, warn }) {
  const sourcePath = resolveOpenApiSourcePath(rootDir, projectConfig);
  if (await pathExists(sourcePath)) {
    try {
      await loadSupportedOpenApiSpec(sourcePath);
      pass(`Downloaded OpenAPI JSON is valid: ${toDoctorRelativePath(rootDir, sourcePath)}`);
    } catch (error) {
      fail(`Downloaded OpenAPI JSON is invalid: ${error.message}`);
    }
    return;
  }

  warn(`Downloaded OpenAPI JSON not found: ${toDoctorRelativePath(rootDir, sourcePath)}`);
  lines.push('  Next: run npx --yes openapi-projector@latest refresh after sourceUrl is configured.');
}

export { checkDownloadedOpenApiSource };
