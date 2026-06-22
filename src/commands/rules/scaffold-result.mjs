function createProjectRulesWriteResult({
  scaffoldCreated = false,
  scaffoldRefreshed = false,
  rulesMigrated = false,
  rulesMigrationEntries = [],
} = {}) {
  return {
    scaffoldCreated,
    scaffoldRefreshed,
    rulesMigrated,
    rulesMigrationEntries,
  };
}

function unchangedProjectRulesResult() {
  return createProjectRulesWriteResult();
}

export {
  createProjectRulesWriteResult,
  unchangedProjectRulesResult,
};
