import { createHash } from 'node:crypto';

import { DEFAULT_HOOK_RULES } from './defaults.mjs';

const SCAFFOLD_SIGNATURE_VERSION = 2;

function buildScaffoldSignature(candidate) {
  const payload = {
    version: SCAFFOLD_SIGNATURE_VERSION,
    api: candidate.api,
    hooks: candidate.hooks ?? DEFAULT_HOOK_RULES,
    layout: candidate.layout,
    reviewNotes: candidate.reviewNotes,
  };

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
}

function createScaffoldCandidate(candidate) {
  return {
    ...candidate,
    scaffoldSignature: buildScaffoldSignature(candidate),
  };
}

export { buildScaffoldSignature, createScaffoldCandidate };
