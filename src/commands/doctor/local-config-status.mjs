import path from 'node:path';

import { normalizeNonBlankString } from '../../core/text-utils.mjs';

function isConfiguredString(value) {
  return Boolean(normalizeNonBlankString(value));
}

function reportLocalConfigStatus(context, rootDir, { fail, lines, pass, warn }) {
  if (context.toolLocalConfig) {
    const localConfigName = path.basename(context.toolLocalConfigPath);
    if (localConfigName === '.openapi-tool.local.jsonc') {
      warn(`Using legacy local config: ${localConfigName}`);
      warn('Prefer .openapi-projector.local.jsonc for new setups.');
      if (
        context.toolLocalConfigs?.some(
          (entry) =>
            path.basename(entry.toolLocalConfigPath) === '.openapi-projector.local.jsonc' &&
            !isConfiguredString(entry.toolLocalConfig?.projectRoot),
        )
      ) {
        warn('The new local config exists but projectRoot is blank, so legacy config was used.');
      }
    } else {
      pass(`Local config found: ${localConfigName}`);
    }
    return;
  }

  if (rootDir) {
    warn('Local config not found. Using current target root.');
    return;
  }

  fail('Local config not found.');
  lines.push('  Fix: run npx --yes openapi-projector@latest init.');
}

export { reportLocalConfigStatus };
