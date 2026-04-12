import fs from 'node:fs/promises';
import path from 'node:path';

import {
  ensureDir,
  loadProjectConfig,
  writeText,
} from '../core/openapi-utils.mjs';

const rulesCommand = {
  name: 'rules',
  async run() {
    const rootDir = process.cwd();
    const { projectConfig } = await loadProjectConfig(rootDir);

    const analysisPath = path.resolve(
      rootDir,
      projectConfig.projectRulesAnalysisPath ?? 'openapi/review/project-rules/analysis.md',
    );
    const rulesPath = path.resolve(
      rootDir,
      projectConfig.projectRulesPath ?? 'openapi/config/project-rules.jsonc',
    );
    const entitiesRoot = path.resolve(rootDir, 'src/entities');

    const featureDirs = await listDirectories(entitiesRoot);
    const featureLayouts = await Promise.all(
      featureDirs.map(async (featureDir) => {
        const childDirs = await listDirectories(featureDir);
        return {
          feature: path.basename(featureDir),
          childDirs: childDirs.map((dirPath) => path.basename(dirPath)).sort(),
        };
      }),
    );

    const apiFiles = await collectFiles(path.resolve(rootDir, 'src/entities'), (filePath) =>
      filePath.includes(`${path.sep}api${path.sep}`) && filePath.endsWith('.ts'),
    );
    const modelFiles = await collectFiles(path.resolve(rootDir, 'src/entities'), (filePath) =>
      filePath.includes(`${path.sep}model${path.sep}`) && filePath.endsWith('.ts'),
    );

    const fetchApiImportStats = await collectNamedImportStats(apiFiles, ['fetchAPI']);
    const commonTypeImportStats = await collectNamedImportStats(apiFiles, [
      'Response',
      'PagedResponse',
      'IPageRequest',
    ]);
    const apiUrlsImportStats = await collectNamedImportStats(apiFiles, ['API_URLS']);

    const fetchApiImportPath = findMostUsedImportPath(fetchApiImportStats) ?? '@/shared/api';
    const commonTypesImportPath =
      findMostUsedImportPath(commonTypeImportStats) ?? '@/shared/type';
    const apiUrlsImportPath =
      findMostUsedImportPath(apiUrlsImportStats) ?? '@/shared/constant';

    const modelStats = await collectModelStats(modelFiles);
    const layoutStats = buildLayoutStats(featureLayouts);

    await writeText(
      analysisPath,
      renderAnalysisMarkdown({
        generatedAt: new Date().toISOString(),
        entitiesRoot: toPosixPath(path.relative(rootDir, entitiesRoot)),
        totalFeatures: featureLayouts.length,
        layoutStats,
        fetchApiImportStats,
        commonTypeImportStats,
        apiUrlsImportStats,
        modelStats,
        featureLayouts,
        rulesPath: toPosixPath(path.relative(rootDir, rulesPath)),
      }),
    );

    let scaffoldCreated = false;

    try {
      await fs.access(rulesPath);
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }

      scaffoldCreated = true;
      await ensureDir(path.dirname(rulesPath));
      await writeText(
        rulesPath,
        buildRulesJsonc({
          analysisPath: toPosixPath(path.relative(rootDir, analysisPath)),
          fetchApiImportPath,
          commonTypesImportPath,
          apiUrlsImportPath,
        }),
      );
    }

    console.log(`Updated project rules analysis: ${analysisPath}`);
    if (scaffoldCreated) {
      console.log(`Created project rules scaffold: ${rulesPath}`);
    } else {
      console.log(`Preserved existing project rules: ${rulesPath}`);
    }
  },
};

async function listDirectories(targetDir) {
  try {
    const entries = await fs.readdir(targetDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(targetDir, entry.name))
      .sort((left, right) => left.localeCompare(right));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
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

  for (const filePath of filePaths) {
    const source = await fs.readFile(filePath, 'utf8');
    const importRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;

    for (const match of source.matchAll(importRegex)) {
      const imports = match[1]
        .split(',')
        .map((item) => item.trim())
        .map((item) => item.split(/\s+as\s+/)[0])
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

async function collectModelStats(modelFiles) {
  let extendsIPageRequest = 0;
  let omitIPageRequest = 0;
  let responseWrapperInterfaces = 0;

  for (const filePath of modelFiles) {
    const source = await fs.readFile(filePath, 'utf8');
    extendsIPageRequest += (source.match(/extends\s+IPageRequest/g) ?? []).length;
    omitIPageRequest += (source.match(/Omit<\s*IPageRequest/g) ?? []).length;
    responseWrapperInterfaces += (source.match(/(?:interface|type)\s+\w+.*(?:Response|PagedResponse)</g) ?? []).length;
  }

  return {
    extendsIPageRequest,
    omitIPageRequest,
    responseWrapperInterfaces,
  };
}

function buildLayoutStats(featureLayouts) {
  const counts = new Map();

  for (const featureLayout of featureLayouts) {
    const key = featureLayout.childDirs.join(', ') || '(none)';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([layout, count]) => ({ layout, count }))
    .sort((left, right) => right.count - left.count || left.layout.localeCompare(right.layout));
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

function renderFeatureLayouts(featureLayouts) {
  if (featureLayouts.length === 0) {
    return '- 없음';
  }

  return featureLayouts
    .map((item) => `- \`${item.feature}\`: ${item.childDirs.length > 0 ? item.childDirs.join(', ') : '(none)'}`)
    .join('\n');
}

function renderLayoutStats(layoutStats) {
  if (layoutStats.length === 0) {
    return '- 없음';
  }

  return layoutStats.map((item) => `- ${item.layout}: ${item.count}`).join('\n');
}

function renderAnalysisMarkdown({
  generatedAt,
  entitiesRoot,
  totalFeatures,
  layoutStats,
  fetchApiImportStats,
  commonTypeImportStats,
  apiUrlsImportStats,
  modelStats,
  featureLayouts,
  rulesPath,
}) {
  return `# Project Rules Analysis

- Generated at: ${generatedAt}
- Entities root: \`${entitiesRoot}\`
- Total feature directories: ${totalFeatures}
- Rules scaffold: \`${rulesPath}\`

## Feature Layout Overview

${renderLayoutStats(layoutStats)}

## Feature Directories

${renderFeatureLayouts(featureLayouts)}

## API Layer Imports

### fetchAPI import paths

${renderStatsList(fetchApiImportStats)}

### common type import paths

${renderStatsList(commonTypeImportStats)}

### API_URLS import paths

${renderStatsList(apiUrlsImportStats)}

## DTO Layer Conventions

- \`extends IPageRequest\` usage: ${modelStats.extendsIPageRequest}
- \`Omit<IPageRequest, ...>\` usage: ${modelStats.omitIPageRequest}
- generic response wrapper interface count: ${modelStats.responseWrapperInterfaces}

## Recommendation

- \`project\` 단계는 이 문서를 보고 \`${rulesPath}\`를 먼저 확정한 뒤 실행합니다.
- 현재 생성기는 아래 규칙을 deterministic 하게 반영할 수 있습니다.
  - fetch helper import 경로
  - 공통 Response/PagedResponse import 경로
  - query flatten 전략
  - jsend 응답 래퍼 변환 전략
  - multipart FormData 변환 전략
- \`API_URLS\` 매핑, feature별 \`src/entities/*\` 배치, 기존 filter/type 재사용은 아직 별도 규칙 정의가 더 필요합니다.
`;
}

function buildRulesJsonc({
  analysisPath,
  fetchApiImportPath,
  commonTypesImportPath,
  apiUrlsImportPath,
}) {
  return `{
  // rules 명령이 생성한 프로젝트 규칙 scaffold 입니다.
  // 사람이 먼저 검토/수정한 뒤 project 명령이 이 파일을 읽습니다.
  "analysisPath": ${JSON.stringify(analysisPath)},

  "api": {
    // project api 후보가 import 할 fetch helper 경로입니다.
    "fetchApiImportPath": ${JSON.stringify(fetchApiImportPath)},

    // fetch helper 함수 이름입니다.
    "fetchApiSymbol": "fetchAPI",

    // Axios config 타입 import 경로입니다.
    "axiosConfigImportPath": "axios",

    // Axios config 타입 이름입니다.
    "axiosConfigTypeName": "AxiosRequestConfig",

    // 현재 프로젝트는 API_URLS 사용 비중이 높지만,
    // path -> API_URLS 키 매핑은 아직 deterministic 하지 않아 기본값은 literal path 입니다.
    "apiUrlsImportPath": ${JSON.stringify(apiUrlsImportPath)},
    "pathSource": "literal"
  },

  "types": {
    // Response / PagedResponse / IPageRequest 공통 타입 import 경로입니다.
    "commonTypesImportPath": ${JSON.stringify(commonTypesImportPath)},
    "responseTypeName": "Response",
    "pagedResponseTypeName": "PagedResponse",
    "pageRequestTypeName": "IPageRequest"
  },

  "generation": {
    // OpenAPI query object(form + explode)를 한 단계 flatten 합니다.
    "queryFlattenStrategy": "form_explode_object",

    // Jsend(status/message/data) 응답을 Response<T> / PagedResponse<T>로 변환합니다.
    "responseWrapperStrategy": "jsend_to_response",

    // multipart/form-data body는 FormData 로 변환합니다.
    "multipartStrategy": "form-data"
  }
}
`;
}

export { rulesCommand };
