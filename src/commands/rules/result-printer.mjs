import { formatSuccess } from '../../cli/format.mjs';

function printProjectRulesResult({
  analysisJsonPath,
  analysisPath,
  rulesPath,
  scaffoldCreated,
  scaffoldRefreshed,
  rulesMigrated,
  rulesMigrationEntries,
}) {
  console.log(formatSuccess(`Updated project rules analysis: ${analysisPath}`));
  console.log(formatSuccess(`Updated project rules analysis JSON: ${analysisJsonPath}`));
  if (scaffoldCreated) {
    console.log(formatSuccess(`Created project rules scaffold: ${rulesPath}`));
  } else if (scaffoldRefreshed) {
    console.log(formatSuccess(`Refreshed project rules scaffold: ${rulesPath}`));
  } else if (rulesMigrated) {
    console.log(formatSuccess(`Migrated project rules defaults: ${rulesPath}`));
    for (const entry of rulesMigrationEntries) {
      console.log(`  - ${entry.action} ${entry.path}: ${JSON.stringify(entry.value)}`);
    }
    console.log(`  - check: ${rulesPath}`);
  } else {
    console.log(formatSuccess(`Preserved existing project rules: ${rulesPath}`));
  }
}

export { printProjectRulesResult };
