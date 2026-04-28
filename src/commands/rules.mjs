import path from 'node:path';

import { ensureDir, loadProjectConfig, readJson, writeJson, writeText } from '../core/openapi-utils.mjs';
import { analyzeProject } from '../project-analyzer/index.mjs';
import { pathExists } from '../project-analyzer/scan-files.mjs';

function findMostUsedImportPath(stats) {
  return stats[0]?.importPath ?? null;
}

function toPosixPath(value) {
  return value.replaceAll(path.sep, '/');
}

function renderStatsList(stats) {
  if (stats.length === 0) {
    return '- 없음';
  }

  return stats.map((item) => `- \`${item.importPath}\`: ${item.count}`).join('\n');
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
    renderCandidateSection('HTTP client candidate', analysis.httpClient),
    renderCandidateSection('API helper candidate', analysis.apiHelper),
    renderCandidateSection('API layer candidate', analysis.apiLayer),
    renderCandidateSection('Naming candidate', analysis.naming),
    '## fetchAPI import candidates',
    '',
    renderStatsList(analysis.legacy.fetchApiImportStats),
    '',
    '## MVP v2 fixed defaults',
    '',
    '- wrapper grouping default: `tag` (`flat` is also supported)',
    '- tag file case: `title`',
    '- schema file name: `schema.ts`',
    '- api dir name: `apis`',
    '',
  ].join('\n');
}

function buildRulesJsonc({
  analysisPath,
  analysisJsonPath,
  fetchApiImportPath,
  fetchApiSymbol,
  adapterStyle,
}) {
  return `{
  // MVP v2 project-rules scaffold 입니다.
  // 분석 문서: ${analysisPath}
  // 분석 JSON: ${analysisJsonPath}
  "api": {
    "fetchApiImportPath": ${JSON.stringify(fetchApiImportPath)},
    "fetchApiSymbol": ${JSON.stringify(fetchApiSymbol)},
    "adapterStyle": ${JSON.stringify(adapterStyle)},
    "wrapperGrouping": "tag",
    "tagFileCase": "title"
  },
  "layout": {
    "schemaFileName": "schema.ts",
    "apiDirName": "apis"
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
    const analysis = await analyzeProject(rootDir, { generatedAt });
    const fetchApiImportStats = analysis.legacy.fetchApiImportStats;
    const apiHelper = analysis.apiHelper.value ?? {};
    const fetchApiImportPath =
      findMostUsedImportPath(fetchApiImportStats) ??
      (apiHelper.importPath && apiHelper.importPath !== '<local>'
        ? apiHelper.importPath
        : '@/shared/api');
    const fetchApiSymbol = apiHelper.symbol ?? 'fetchAPI';
    const adapterStyle = ['url-config', 'request-object'].includes(apiHelper.callStyle)
      ? apiHelper.callStyle
      : 'url-config';

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
    let rulesMigrated = false;
    if (!(await pathExists(rulesPath))) {
      scaffoldCreated = true;
      await ensureDir(path.dirname(rulesPath));
      await writeText(
        rulesPath,
        buildRulesJsonc({
          analysisPath: toPosixPath(path.relative(rootDir, analysisPath)),
          analysisJsonPath: toPosixPath(path.relative(rootDir, analysisJsonPath)),
          fetchApiImportPath,
          fetchApiSymbol,
          adapterStyle,
        }),
      );
    } else {
      const existingRules = await readJson(rulesPath);
      const nextRules = {
        ...existingRules,
        api: {
          ...(existingRules.api ?? {}),
          tagFileCase:
            existingRules?.api?.tagFileCase === 'kebab' ||
            existingRules?.api?.tagFileCase == null
              ? 'title'
              : existingRules.api.tagFileCase,
        },
      };

      if (JSON.stringify(existingRules) !== JSON.stringify(nextRules)) {
        rulesMigrated = true;
        await writeJson(rulesPath, nextRules);
      }
    }

    console.log(`Updated project rules analysis: ${analysisPath}`);
    console.log(`Updated project rules analysis JSON: ${analysisJsonPath}`);
    if (scaffoldCreated) {
      console.log(`Created project rules scaffold: ${rulesPath}`);
    } else if (rulesMigrated) {
      console.log(`Migrated project rules defaults: ${rulesPath}`);
    } else {
      console.log(`Preserved existing project rules: ${rulesPath}`);
    }
  },
};

export { rulesCommand };
