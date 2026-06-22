import {
  initToolLocalConfig,
  upgradeProjectDocs,
} from '../../core/project-workspace.mjs';
import { rulesCommand } from '../rules.mjs';
import {
  logUpdateResult,
  logUpgradeDocsResult,
} from './output.mjs';

async function runUpgradeDocs(rootDir) {
  const result = await upgradeProjectDocs(rootDir);
  logUpgradeDocsResult(rootDir, result);
}

async function runUpdate(rootDir, options = {}) {
  const docsResult = await upgradeProjectDocs(rootDir);
  const localConfigResult = await initToolLocalConfig(rootDir);

  logUpdateResult(rootDir, docsResult, localConfigResult);

  await rulesCommand.run(options);
}

export {
  runUpdate,
  runUpgradeDocs,
};
