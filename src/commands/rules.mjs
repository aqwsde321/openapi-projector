import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { ensureDir, loadProjectConfig, readJson, writeJson, writeText } from '../core/openapi-utils.mjs';
import {
  UNKNOWN_API_HELPER_CALL_STYLE_WARNING_MESSAGE,
  UNSUPPORTED_API_HELPER_IMPORT_KIND_WARNING_MESSAGE,
  analyzeProject,
} from '../project-analyzer/index.mjs';
import { pathExists } from '../project-analyzer/scan-files.mjs';

const DEFAULT_API_RULES = {
  fetchApiImportPath: '@/shared/api',
  fetchApiSymbol: 'fetchAPI',
  fetchApiImportKind: 'named',
  adapterStyle: 'url-config',
  wrapperGrouping: 'tag',
  tagFileCase: 'title',
};
const DEFAULT_LAYOUT_RULES = {
  schemaFileName: 'schema.ts',
};
const LEGACY_SCHEMA_LAYOUT_RULES = {
  schemaFileName: 'schema.ts',
  apiDirName: 'apis',
};
const DEFAULT_REVIEW_RULES = {
  rulesReviewed: false,
  notes: [],
};
const UNKNOWN_CALL_STYLE_REVIEW_NOTE =
  'adapterStyle was defaulted to url-config because the analyzer could not confirm the helper call shape. Inspect existing API calls before setting rulesReviewed to true.';
const UNSUPPORTED_IMPORT_KIND_REVIEW_NOTE =
  'fetchApiImportKind was defaulted to named because the analyzer found a helper import kind that generated wrappers do not support directly.';
const GENERATED_REVIEW_NOTES = new Set([
  UNKNOWN_API_HELPER_CALL_STYLE_WARNING_MESSAGE,
  UNSUPPORTED_API_HELPER_IMPORT_KIND_WARNING_MESSAGE,
  UNKNOWN_CALL_STYLE_REVIEW_NOTE,
  UNSUPPORTED_IMPORT_KIND_REVIEW_NOTE,
]);
const SCAFFOLD_SIGNATURE_VERSION = 1;
const DEFAULT_API_RULE_KEYS = new Set(Object.keys(DEFAULT_API_RULES));
const DEFAULT_LAYOUT_RULE_KEYS = new Set(Object.keys(LEGACY_SCHEMA_LAYOUT_RULES));
const DEFAULT_REVIEW_RULE_KEYS = new Set([
  ...Object.keys(DEFAULT_REVIEW_RULES),
  'scaffoldSignature',
]);
const DEFAULT_ROOT_RULE_KEYS = new Set(['api', 'layout', 'review']);

function findMostUsedImportPath(stats) {
  return stats[0]?.importPath ?? null;
}

function toPosixPath(value) {
  return value.replaceAll(path.sep, '/');
}

function isPlainObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function hasOnlyKeys(value, allowedKeys) {
  return Object.keys(value ?? {}).every((key) => allowedKeys.has(key));
}

function arraysEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => item === right[index]);
}

function buildScaffoldSignature(candidate) {
  const payload = {
    version: SCAFFOLD_SIGNATURE_VERSION,
    api: candidate.api,
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

function buildScaffoldDefaultsFromAnalysis(analysis) {
  const apiHelper = analysis?.apiHelper?.value ?? {};
  const fetchApiImportStats = analysis?.legacy?.fetchApiImportStats ?? [];
  const hasImportedHelper = apiHelper.importPath && apiHelper.importPath !== '<local>';
  const fetchApiImportPath = hasImportedHelper
    ? apiHelper.importPath
    : findMostUsedImportPath(fetchApiImportStats) ?? DEFAULT_API_RULES.fetchApiImportPath;
  const fetchApiSymbol = hasImportedHelper
    ? apiHelper.symbol ?? DEFAULT_API_RULES.fetchApiSymbol
    : DEFAULT_API_RULES.fetchApiSymbol;
  const fetchApiImportKind =
    hasImportedHelper && apiHelper.importKind === 'default' ? 'default' : 'named';
  const adapterStyle = ['url-config', 'request-object'].includes(apiHelper.callStyle)
    ? apiHelper.callStyle
    : DEFAULT_API_RULES.adapterStyle;

  return createScaffoldCandidate({
    api: {
      fetchApiImportPath,
      fetchApiSymbol,
      fetchApiImportKind,
      adapterStyle,
      wrapperGrouping: DEFAULT_API_RULES.wrapperGrouping,
      tagFileCase: DEFAULT_API_RULES.tagFileCase,
    },
    layout: DEFAULT_LAYOUT_RULES,
    reviewNotes: buildReviewNotes(analysis),
  });
}

function buildReviewNotes(analysis) {
  const apiHelper = analysis?.apiHelper?.value ?? {};

  return [
    ...(analysis?.warnings ?? []).map((warning) => warning.message),
    ...(apiHelper.callStyle === 'unknown' ? [UNKNOWN_CALL_STYLE_REVIEW_NOTE] : []),
    ...(apiHelper.importKind && !['named', 'default'].includes(apiHelper.importKind)
      ? [UNSUPPORTED_IMPORT_KIND_REVIEW_NOTE]
      : []),
  ];
}

function hasOnlyGeneratedReviewNotes(review, { allowEmpty = false } = {}) {
  const notes = review.notes ?? [];

  return (
    review.rulesReviewed === false &&
    Array.isArray(notes) &&
    (allowEmpty || notes.length > 0) &&
    notes.every((note) => GENERATED_REVIEW_NOTES.has(note))
  );
}

function buildCurrentRulesScaffoldCandidate(rules) {
  const api = rules.api ?? {};
  const review = rules.review ?? DEFAULT_REVIEW_RULES;
  const notes = review.notes ?? [];

  if (!hasOnlyGeneratedReviewNotes(review, { allowEmpty: true })) {
    return null;
  }

  if (typeof review.scaffoldSignature !== 'string' || !review.scaffoldSignature.trim()) {
    return null;
  }

  if (
    typeof api.fetchApiImportPath !== 'string' ||
    typeof api.fetchApiSymbol !== 'string' ||
    !['url-config', 'request-object'].includes(api.adapterStyle)
  ) {
    return null;
  }

  const candidate = createScaffoldCandidate({
    api: {
      fetchApiImportPath: api.fetchApiImportPath,
      fetchApiSymbol: api.fetchApiSymbol,
      fetchApiImportKind: api.fetchApiImportKind ?? DEFAULT_API_RULES.fetchApiImportKind,
      adapterStyle: api.adapterStyle,
      wrapperGrouping: DEFAULT_API_RULES.wrapperGrouping,
      tagFileCase: DEFAULT_API_RULES.tagFileCase,
    },
    layout: DEFAULT_LAYOUT_RULES,
    reviewNotes: notes,
  });

  return review.scaffoldSignature === candidate.scaffoldSignature ? candidate : null;
}

function matchesScaffoldApiValues(api, expectedApi) {
  return Object.keys(DEFAULT_API_RULES).every((key) => {
    if (key === 'fetchApiImportKind' && api[key] == null) {
      return true;
    }

    return api[key] === expectedApi[key];
  });
}

function matchesScaffoldLayoutValues(layout, expectedLayout) {
  return (
    (layout.schemaFileName == null ||
      layout.schemaFileName === expectedLayout.schemaFileName ||
      layout.schemaFileName === LEGACY_SCHEMA_LAYOUT_RULES.schemaFileName) &&
    (layout.apiDirName == null ||
      layout.apiDirName === expectedLayout.apiDirName ||
      layout.apiDirName === LEGACY_SCHEMA_LAYOUT_RULES.apiDirName)
  );
}

function matchesScaffoldReviewValues(review, candidate) {
  const notes = review.notes ?? [];

  if (review.rulesReviewed !== false || !arraysEqual(notes, candidate.reviewNotes)) {
    return false;
  }

  if (review.scaffoldSignature == null) {
    return true;
  }

  return review.scaffoldSignature === candidate.scaffoldSignature;
}

function matchesScaffoldCandidate({ api, layout, review }, candidate) {
  return (
    matchesScaffoldApiValues(api, candidate.api) &&
    matchesScaffoldLayoutValues(layout, candidate.layout) &&
    matchesScaffoldReviewValues(review, candidate)
  );
}

function buildScaffoldCandidates(previousAnalysis, rules) {
  const candidates = [
    createScaffoldCandidate({
      api: DEFAULT_API_RULES,
      layout: DEFAULT_LAYOUT_RULES,
      reviewNotes: DEFAULT_REVIEW_RULES.notes,
    }),
    createScaffoldCandidate({
      api: DEFAULT_API_RULES,
      layout: LEGACY_SCHEMA_LAYOUT_RULES,
      reviewNotes: DEFAULT_REVIEW_RULES.notes,
    }),
  ];

  if (previousAnalysis) {
    const previousCandidate = buildScaffoldDefaultsFromAnalysis(previousAnalysis);
    candidates.push(previousCandidate);
    candidates.push(
      createScaffoldCandidate({
        api: previousCandidate.api,
        layout: LEGACY_SCHEMA_LAYOUT_RULES,
        reviewNotes: previousCandidate.reviewNotes,
      }),
    );
  }

  const currentRulesCandidate = buildCurrentRulesScaffoldCandidate(rules);
  if (currentRulesCandidate) {
    candidates.push(currentRulesCandidate);
  }

  return candidates;
}

function isDefaultProjectRulesScaffold(rules, previousAnalysis = null) {
  if (!isPlainObject(rules) || !hasOnlyKeys(rules, DEFAULT_ROOT_RULE_KEYS)) {
    return false;
  }

  const api = rules.api ?? {};
  const layout = rules.layout ?? {};
  const review = rules.review ?? DEFAULT_REVIEW_RULES;
  const hasKnownShape =
    isPlainObject(api) &&
    isPlainObject(layout) &&
    isPlainObject(review) &&
    hasOnlyKeys(api, DEFAULT_API_RULE_KEYS) &&
    hasOnlyKeys(layout, DEFAULT_LAYOUT_RULE_KEYS) &&
    hasOnlyKeys(review, DEFAULT_REVIEW_RULE_KEYS);

  if (!hasKnownShape) {
    return false;
  }

  return buildScaffoldCandidates(previousAnalysis, rules).some((candidate) =>
    matchesScaffoldCandidate({ api, layout, review }, candidate),
  );
}

function renderStatsList(stats) {
  if (stats.length === 0) {
    return '- 없음';
  }

  return stats.map((item) => `- \`${item.importPath}\`: ${item.count}`).join('\n');
}

function renderPathAliasList(pathAliases) {
  if (!pathAliases?.configPath || pathAliases.mappings.length === 0) {
    return '- 없음';
  }

  return [
    `- Config: \`${pathAliases.configPath}\``,
    ...pathAliases.mappings.map(
      (item) => `- \`${item.aliasPattern}\` -> \`${item.targetPattern}\``,
    ),
  ].join('\n');
}

function renderSectionStats(sections) {
  if (!sections || sections.length === 0) {
    return '- 없음';
  }

  return sections.map((item) => `- \`${item.section}\`: ${item.count}`).join('\n');
}

function renderWarnings(warnings) {
  if (!warnings || warnings.length === 0) {
    return '- 없음';
  }

  return warnings.map((item) => `- \`${item.code}\`: ${item.message}`).join('\n');
}

function renderEvidenceList(evidence) {
  if (!evidence || evidence.length === 0) {
    return '- 근거 없음';
  }

  return evidence
    .map((item) => {
      const snippet = item.snippet ? ` — \`${item.snippet}\`` : '';
      return `- \`${item.file}\`: ${item.reason}${snippet}`;
    })
    .join('\n');
}

function renderCandidateValue(value) {
  if (value && typeof value === 'object') {
    return `\`${JSON.stringify(value)}\``;
  }

  return `\`${String(value)}\``;
}

function renderCandidateSection(title, candidate) {
  return [
    `## ${title}`,
    '',
    `- Value: ${renderCandidateValue(candidate.value)}`,
    `- Confidence: ${candidate.confidence}`,
    '',
    '### Evidence',
    '',
    renderEvidenceList(candidate.evidence),
    '',
  ].join('\n');
}

function renderAnalysisMarkdown({
  analysis,
  analysisJsonPath,
  rulesPath,
}) {
  return [
    '# Project Rules Analysis',
    '',
    `- Generated at: ${analysis.generatedAt}`,
    `- Analysis root: \`${analysis.files.analysisRoot}\``,
    `- Total TypeScript files scanned: ${analysis.files.scanned}`,
    `- Analysis JSON: \`${analysisJsonPath}\``,
    `- Suggested rules file: \`${rulesPath}\``,
    '',
    '## Warnings',
    '',
    renderWarnings(analysis.warnings),
    '',
    '## Source sections scanned',
    '',
    renderSectionStats(analysis.files.sections),
    '',
    renderCandidateSection('HTTP client candidate', analysis.httpClient),
    renderCandidateSection('API helper candidate', analysis.apiHelper),
    renderCandidateSection('API layer candidate', analysis.apiLayer),
    renderCandidateSection('Naming candidate', analysis.naming),
    '## Path alias mappings',
    '',
    renderPathAliasList(analysis.pathAliases),
    '',
    '## fetchAPI import candidates',
    '',
    renderStatsList(analysis.legacy.fetchApiImportStats),
    '',
    '## MVP v2 fixed defaults',
    '',
    '- wrapper grouping default: `tag` (`flat` is also supported)',
    '- tag file case: `title`',
    '- schema file name: `schema.ts`',
    '',
  ].join('\n');
}

function buildRulesJsonc({
  analysisPath,
  analysisJsonPath,
  fetchApiImportPath,
  fetchApiSymbol,
  fetchApiImportKind,
  adapterStyle,
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
  "layout": {
    "schemaFileName": "schema.ts"
  }
}
`;
}

const rulesCommand = {
  name: 'rules',
  async run(options = {}) {
    const context = Array.isArray(options) ? {} : (options.context ?? {});
    const rootDir = context.targetRoot ?? process.cwd();
    const { projectConfig } = await loadProjectConfig(rootDir);
    const analysisPath = path.resolve(
      rootDir,
      projectConfig.projectRulesAnalysisPath ?? 'openapi/review/project-rules/analysis.md',
    );
    const analysisJsonPath = path.resolve(
      rootDir,
      projectConfig.projectRulesAnalysisJsonPath ??
        path.join(
          path.dirname(projectConfig.projectRulesAnalysisPath ?? 'openapi/review/project-rules/analysis.md'),
          'analysis.json',
        ),
    );
    const rulesPath = path.resolve(
      rootDir,
      projectConfig.projectRulesPath ?? 'openapi/config/project-rules.jsonc',
    );
    const generatedAt = new Date().toISOString();
    let previousAnalysis = null;
    if (await pathExists(analysisJsonPath)) {
      try {
        previousAnalysis = await readJson(analysisJsonPath);
      } catch {
        previousAnalysis = null;
      }
    }

    const analysis = await analyzeProject(rootDir, { generatedAt });
    const scaffoldDefaults = buildScaffoldDefaultsFromAnalysis(analysis);

    await writeJson(analysisJsonPath, analysis);

    await writeText(
      analysisPath,
      renderAnalysisMarkdown({
        analysis,
        analysisJsonPath: toPosixPath(path.relative(rootDir, analysisJsonPath)),
        rulesPath: toPosixPath(path.relative(rootDir, rulesPath)),
      }),
    );

    let scaffoldCreated = false;
    let scaffoldRefreshed = false;
    let rulesMigrated = false;
    if (!(await pathExists(rulesPath))) {
      scaffoldCreated = true;
      await ensureDir(path.dirname(rulesPath));
      await writeText(
        rulesPath,
        buildRulesJsonc({
          analysisPath: toPosixPath(path.relative(rootDir, analysisPath)),
          analysisJsonPath: toPosixPath(path.relative(rootDir, analysisJsonPath)),
          fetchApiImportPath: scaffoldDefaults.api.fetchApiImportPath,
          fetchApiSymbol: scaffoldDefaults.api.fetchApiSymbol,
          fetchApiImportKind: scaffoldDefaults.api.fetchApiImportKind,
          adapterStyle: scaffoldDefaults.api.adapterStyle,
          reviewNotes: scaffoldDefaults.reviewNotes,
        }),
      );
    } else {
      const existingRulesSource = await fs.readFile(rulesPath, 'utf8');
      const existingRules = await readJson(rulesPath);
      if (isDefaultProjectRulesScaffold(existingRules, previousAnalysis)) {
        const nextRulesSource = buildRulesJsonc({
          analysisPath: toPosixPath(path.relative(rootDir, analysisPath)),
          analysisJsonPath: toPosixPath(path.relative(rootDir, analysisJsonPath)),
          fetchApiImportPath: scaffoldDefaults.api.fetchApiImportPath,
          fetchApiSymbol: scaffoldDefaults.api.fetchApiSymbol,
          fetchApiImportKind: scaffoldDefaults.api.fetchApiImportKind,
          adapterStyle: scaffoldDefaults.api.adapterStyle,
          reviewNotes: scaffoldDefaults.reviewNotes,
        });
        if (existingRulesSource !== nextRulesSource) {
          scaffoldRefreshed = true;
          await writeText(rulesPath, nextRulesSource);
        }
      } else {
        const nextRules = {
          ...existingRules,
          api: {
            ...(existingRules.api ?? {}),
            tagFileCase: existingRules?.api?.tagFileCase ?? 'title',
          },
        };

        if (JSON.stringify(existingRules) !== JSON.stringify(nextRules)) {
          rulesMigrated = true;
          await writeJson(rulesPath, nextRules);
        }
      }
    }

    console.log(`Updated project rules analysis: ${analysisPath}`);
    console.log(`Updated project rules analysis JSON: ${analysisJsonPath}`);
    if (scaffoldCreated) {
      console.log(`Created project rules scaffold: ${rulesPath}`);
    } else if (scaffoldRefreshed) {
      console.log(`Refreshed project rules scaffold: ${rulesPath}`);
    } else if (rulesMigrated) {
      console.log(`Migrated project rules defaults: ${rulesPath}`);
    } else {
      console.log(`Preserved existing project rules: ${rulesPath}`);
    }
  },
};

export { rulesCommand };
