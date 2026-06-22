import path from 'node:path';

import { ensureDir, pathExists, readJson, readText, writeText } from '../../io/files.mjs';
import { isDefaultProjectRulesScaffold } from '../../project-rules/scaffold-candidates.mjs';
import {
  createProjectRulesWriteResult,
  unchangedProjectRulesResult,
} from './scaffold-result.mjs';
import { migrateProjectRulesFile } from './scaffold-migration.mjs';
import { buildProjectRulesScaffoldSource } from './scaffold-source.mjs';

async function createProjectRulesScaffold({
  nextRulesSource,
  rulesPath,
}) {
  await ensureDir(path.dirname(rulesPath));
  await writeText(rulesPath, nextRulesSource);
  return createProjectRulesWriteResult({ scaffoldCreated: true });
}

async function refreshProjectRulesScaffold({
  existingRulesSource,
  nextRulesSource,
  rulesPath,
}) {
  if (existingRulesSource === nextRulesSource) {
    return unchangedProjectRulesResult();
  }

  await writeText(rulesPath, nextRulesSource);
  return createProjectRulesWriteResult({ scaffoldRefreshed: true });
}

async function writeProjectRulesFile({
  analysis,
  analysisJsonPath,
  analysisPath,
  previousAnalysis,
  rootDir,
  rulesPath,
}) {
  const {
    nextRulesSource,
    scaffoldDefaults,
  } = buildProjectRulesScaffoldSource({
    analysis,
    analysisJsonPath,
    analysisPath,
    rootDir,
  });

  if (!(await pathExists(rulesPath))) {
    return createProjectRulesScaffold({
      nextRulesSource,
      rulesPath,
    });
  }

  const existingRulesSource = await readText(rulesPath);
  const existingRules = await readJson(rulesPath);
  if (isDefaultProjectRulesScaffold(existingRules, previousAnalysis)) {
    return refreshProjectRulesScaffold({
      existingRulesSource,
      nextRulesSource,
      rulesPath,
    });
  }

  return migrateProjectRulesFile({
    existingRules,
    rulesPath,
    scaffoldDefaults,
  });
}

export { writeProjectRulesFile };
