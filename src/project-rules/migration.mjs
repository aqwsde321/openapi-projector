import { isPlainObject } from '../core/object-utils.mjs';
import { applyApiDefaults } from './api-default-migration.mjs';
import { getProjectRulesMissingCurrentDefaults } from './current-defaults.mjs';
import { DEFAULT_HOOK_RULES } from './defaults.mjs';

function pushAddedMigration(entries, pathName, value) {
  entries.push({
    action: 'added',
    path: pathName,
    value,
  });
}

function setDefaultIfMissing(target, key, pathName, value, entries) {
  if (target[key] != null) {
    return;
  }

  target[key] = value;
  pushAddedMigration(entries, pathName, value);
}

function applyHookDefaults(hooks, entries, scaffoldDefaults) {
  for (const [key, value] of Object.entries(scaffoldDefaults.hooks ?? DEFAULT_HOOK_RULES)) {
    setDefaultIfMissing(hooks, key, `hooks.${key}`, value, entries);
  }
}

function buildProjectRulesMigration(existingRules, scaffoldDefaults) {
  const entries = [];
  const existingApi = isPlainObject(existingRules.api) ? existingRules.api : {};
  const existingHooks = isPlainObject(existingRules.hooks) ? existingRules.hooks : {};
  const api = { ...existingApi };
  const hooks = { ...existingHooks };

  applyApiDefaults({
    api,
    entries,
    existingApi,
    scaffoldDefaults,
    setDefaultIfMissing,
  });
  applyHookDefaults(hooks, entries, scaffoldDefaults);

  const nextRules = {
    ...existingRules,
    api,
    hooks,
  };

  return {
    entries,
    rules: nextRules,
  };
}

export {
  buildProjectRulesMigration,
  getProjectRulesMissingCurrentDefaults,
};
