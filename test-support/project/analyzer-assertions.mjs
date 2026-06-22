import assert from 'node:assert/strict';

function assertAnalysisHasWarning(analysis, code) {
  assert.ok(
    analysis.warnings.some((warning) => warning.code === code),
    `Expected analyzer warning ${code}`,
  );
}

function assertApiHelperEvidenceIncludes(analysis, reasonFragment) {
  assert.ok(
    analysis.apiHelper.evidence.some((item) => item.reason.includes(reasonFragment)),
    `Expected API helper evidence including ${reasonFragment}`,
  );
}

function assertApiHelperEvidenceExcludes(analysis, reasonFragment) {
  assert.ok(
    analysis.apiHelper.evidence.every((item) => !item.reason.includes(reasonFragment)),
    `Expected API helper evidence to exclude ${reasonFragment}`,
  );
}

export {
  assertAnalysisHasWarning,
  assertApiHelperEvidenceExcludes,
  assertApiHelperEvidenceIncludes,
};
