import {
  DEFAULT_API_RULES,
  DEFAULT_HOOK_RULES,
  DEFAULT_REVIEW_RULES,
  LEGACY_SCHEMA_LAYOUT_RULES,
} from './defaults.mjs';

const DEFAULT_API_RULE_KEYS = new Set(Object.keys(DEFAULT_API_RULES));
const DEFAULT_HOOK_RULE_KEYS = new Set(Object.keys(DEFAULT_HOOK_RULES));
const DEFAULT_LAYOUT_RULE_KEYS = new Set(Object.keys(LEGACY_SCHEMA_LAYOUT_RULES));
const DEFAULT_REVIEW_RULE_KEYS = new Set([
  ...Object.keys(DEFAULT_REVIEW_RULES),
  'scaffoldSignature',
]);
const DEFAULT_ROOT_RULE_KEYS = new Set(['api', 'hooks', 'layout', 'review']);

function hasOnlyKeys(value, allowedKeys) {
  return Object.keys(value ?? {}).every((key) => allowedKeys.has(key));
}

function hasKnownScaffoldShape(rules) {
  const api = rules.api ?? {};
  const hooks = rules.hooks ?? undefined;
  const layout = rules.layout ?? {};
  const review = rules.review ?? DEFAULT_REVIEW_RULES;

  return (
    hasOnlyKeys(rules, DEFAULT_ROOT_RULE_KEYS) &&
    hasOnlyKeys(api, DEFAULT_API_RULE_KEYS) &&
    (hooks == null || hasOnlyKeys(hooks, DEFAULT_HOOK_RULE_KEYS)) &&
    hasOnlyKeys(layout, DEFAULT_LAYOUT_RULE_KEYS) &&
    hasOnlyKeys(review, DEFAULT_REVIEW_RULE_KEYS)
  );
}

export { hasKnownScaffoldShape };
