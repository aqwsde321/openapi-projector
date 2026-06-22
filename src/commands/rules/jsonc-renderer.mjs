import {
  DEFAULT_API_RULES,
  DEFAULT_HOOK_RULES,
  DEFAULT_LAYOUT_RULES,
} from '../../project-rules/defaults.mjs';
import { buildScaffoldSignature } from '../../project-rules/scaffold-candidates.mjs';

function buildRulesJsonc({
  analysisPath,
  analysisJsonPath,
  fetchApiImportPath,
  fetchApiSymbol,
  fetchApiImportKind,
  adapterStyle,
  hooks = DEFAULT_HOOK_RULES,
  reviewNotes = [],
}) {
  const api = {
    fetchApiImportPath,
    fetchApiSymbol,
    fetchApiImportKind,
    adapterStyle,
    wrapperGrouping: DEFAULT_API_RULES.wrapperGrouping,
    tagFileCase: DEFAULT_API_RULES.tagFileCase,
  };
  const scaffoldSignature = buildScaffoldSignature({
    api,
    layout: DEFAULT_LAYOUT_RULES,
    reviewNotes,
  });
  const notesSource =
    reviewNotes.length > 0
      ? `[\n      ${reviewNotes.map((note) => JSON.stringify(note)).join(',\n      ')}\n    ]`
      : '[]';

  return `{
  // MVP v2 project-rules scaffold 입니다.
  // 분석 문서: ${analysisPath}
  // 분석 JSON: ${analysisJsonPath}
  // rulesReviewed 를 true 로 바꾸기 전에는 prepare/project 가 후보 파일을 생성하지 않습니다.
  "review": {
    "rulesReviewed": false,
    "scaffoldSignature": ${JSON.stringify(scaffoldSignature)},
    "notes": ${notesSource}
  },
  "api": {
    "fetchApiImportPath": ${JSON.stringify(fetchApiImportPath)},
    "fetchApiSymbol": ${JSON.stringify(fetchApiSymbol)},
    "fetchApiImportKind": ${JSON.stringify(fetchApiImportKind)},
    "adapterStyle": ${JSON.stringify(adapterStyle)},
    "wrapperGrouping": "tag",
    "tagFileCase": "title"
  },
  "hooks": {
    "enabled": ${hooks.enabled === true},
    "library": ${JSON.stringify(hooks.library ?? DEFAULT_HOOK_RULES.library)},
    "queryMethods": ${JSON.stringify(hooks.queryMethods ?? DEFAULT_HOOK_RULES.queryMethods)},
    "mutationMethods": ${JSON.stringify(hooks.mutationMethods ?? DEFAULT_HOOK_RULES.mutationMethods)},
    "queryKeyStrategy": ${JSON.stringify(hooks.queryKeyStrategy ?? DEFAULT_HOOK_RULES.queryKeyStrategy)},
    "responseUnwrap": ${JSON.stringify(hooks.responseUnwrap ?? DEFAULT_HOOK_RULES.responseUnwrap)}
  },
  "layout": {
    "schemaFileName": "schema.ts"
  }
}
`;
}

export { buildRulesJsonc };
