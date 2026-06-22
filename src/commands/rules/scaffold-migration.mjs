import { writeJson } from '../../io/files.mjs';
import { buildProjectRulesMigration } from '../../project-rules/migration.mjs';
import {
  createProjectRulesWriteResult,
  unchangedProjectRulesResult,
} from './scaffold-result.mjs';

async function migrateProjectRulesFile({
  existingRules,
  rulesPath,
  scaffoldDefaults,
}) {
  const migration = buildProjectRulesMigration(existingRules, scaffoldDefaults);
  const nextRules = migration.rules;

  if (JSON.stringify(existingRules) === JSON.stringify(nextRules)) {
    return unchangedProjectRulesResult();
  }

  await writeJson(rulesPath, nextRules);
  return createProjectRulesWriteResult({
    rulesMigrated: true,
    rulesMigrationEntries: migration.entries,
  });
}

export { migrateProjectRulesFile };
