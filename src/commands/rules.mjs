import fs from 'node:fs/promises';
import path from 'node:path';

import { ensureDir, loadProjectConfig, readJson, writeJson, writeText } from '../core/openapi-utils.mjs';

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function collectFiles(targetDir, predicate) {
  const files = [];
  const stack = [targetDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    let entries = [];

    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT') {
        continue;
      }
      throw error;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && predicate(fullPath)) {
        files.push(fullPath);
      }
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

async function collectNamedImportStats(filePaths, symbols) {
  const counts = new Map();
  const regex = /import\s+(?:type\s+)?{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;

  for (const filePath of filePaths) {
    const source = await fs.readFile(filePath, 'utf8');
    for (const match of source.matchAll(regex)) {
      const imports = match[1]
        .split(',')
        .map((item) => item.trim())
        .map((item) => item.split(/\s+as\s+/)[0]?.trim())
        .filter(Boolean);

      if (!symbols.some((symbol) => imports.includes(symbol))) {
        continue;
      }

      const importPath = match[2];
      counts.set(importPath, (counts.get(importPath) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([importPath, count]) => ({ importPath, count }))
    .sort((left, right) => right.count - left.count || left.importPath.localeCompare(right.importPath));
}

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

function renderAnalysisMarkdown({
  generatedAt,
  analysisRoot,
  totalTsFiles,
  fetchApiImportStats,
  axiosConfigImportStats,
  rulesPath,
}) {
  return [
    '# Project Rules Analysis',
    '',
    `- Generated at: ${generatedAt}`,
    `- Analysis root: \`${analysisRoot}\``,
    `- Total TypeScript files scanned: ${totalTsFiles}`,
    `- Suggested rules file: \`${rulesPath}\``,
    '',
    '## fetchAPI import candidates',
    '',
    renderStatsList(fetchApiImportStats),
    '',
    '## AxiosRequestConfig import candidates',
    '',
    renderStatsList(axiosConfigImportStats),
    '',
    '## MVP v2 fixed defaults',
    '',
    '- wrapper grouping: `tag`',
    '- tag file case: `title`',
    '- schema file name: `schema.ts`',
    '- api dir name: `apis`',
    '',
  ].join('\n');
}

function buildRulesJsonc({
  analysisPath,
  fetchApiImportPath,
  fetchApiSymbol,
  axiosConfigImportPath,
  axiosConfigTypeName,
}) {
  return `{
  // MVP v2 project-rules scaffold 입니다.
  // 분석 문서: ${analysisPath}
  "api": {
    "fetchApiImportPath": ${JSON.stringify(fetchApiImportPath)},
    "fetchApiSymbol": ${JSON.stringify(fetchApiSymbol)},
    "axiosConfigImportPath": ${JSON.stringify(axiosConfigImportPath)},
    "axiosConfigTypeName": ${JSON.stringify(axiosConfigTypeName)},
    "adapterStyle": "url-config",
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
    const rulesPath = path.resolve(
      rootDir,
      projectConfig.projectRulesPath ?? 'openapi/config/project-rules.jsonc',
    );

    const preferredEntitiesRoot = path.resolve(rootDir, 'src/entities');
    const fallbackSrcRoot = path.resolve(rootDir, 'src');
    const analysisRoot = (await pathExists(preferredEntitiesRoot))
      ? preferredEntitiesRoot
      : fallbackSrcRoot;
    const tsFiles = (await pathExists(analysisRoot))
      ? await collectFiles(analysisRoot, (filePath) => /\.(ts|tsx)$/.test(filePath))
      : [];

    const fetchApiImportStats = await collectNamedImportStats(tsFiles, ['fetchAPI']);
    const axiosConfigImportStats = await collectNamedImportStats(tsFiles, ['AxiosRequestConfig']);
    const fetchApiImportPath = findMostUsedImportPath(fetchApiImportStats) ?? '@/shared/api';
    const axiosConfigImportPath = findMostUsedImportPath(axiosConfigImportStats) ?? 'axios';
    const fetchApiSymbol = 'fetchAPI';
    const axiosConfigTypeName = 'AxiosRequestConfig';

    await writeText(
      analysisPath,
      renderAnalysisMarkdown({
        generatedAt: new Date().toISOString(),
        analysisRoot: toPosixPath(path.relative(rootDir, analysisRoot)),
        totalTsFiles: tsFiles.length,
        fetchApiImportStats,
        axiosConfigImportStats,
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
          fetchApiImportPath,
          fetchApiSymbol,
          axiosConfigImportPath,
          axiosConfigTypeName,
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
