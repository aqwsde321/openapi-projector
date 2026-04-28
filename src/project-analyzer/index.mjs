import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

import { scanTypeScriptFiles } from './scan-files.mjs';

const HTTP_CLIENT_PACKAGES = ['axios', 'ky'];
const HELPER_SYMBOLS = new Set([
  'fetchAPI',
  'apiClient',
  'request',
  'http',
  'client',
  'httpClient',
]);
const FUNCTION_PREFIXES = [
  'get',
  'fetch',
  'load',
  'request',
  'create',
  'update',
  'delete',
  'remove',
  'post',
  'put',
  'patch',
];
const DTO_SUFFIXES = ['Dto', 'Response', 'Request', 'Model', 'Payload'];

function toPosixPath(value) {
  return value.replaceAll(path.sep, '/');
}

function relativePath(rootDir, filePath) {
  return toPosixPath(path.relative(rootDir, filePath));
}

function createCandidate(value, confidence = 0, evidence = []) {
  return {
    value,
    confidence,
    evidence,
  };
}

function createEvidence(rootDir, filePath, reason, snippet = null) {
  return {
    file: relativePath(rootDir, filePath),
    reason,
    ...(snippet ? { snippet } : {}),
  };
}

function incrementCounter(map, key, count = 1) {
  map.set(key, (map.get(key) ?? 0) + count);
}

function sortedCounts(map) {
  return [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || String(left.value).localeCompare(String(right.value)));
}

async function readPackageJson(rootDir) {
  try {
    const source = await fs.readFile(path.join(rootDir, 'package.json'), 'utf8');
    return JSON.parse(source);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function collectPackageDependencyEvidence(rootDir, packageJson) {
  const dependencyNames = new Set([
    ...Object.keys(packageJson?.dependencies ?? {}),
    ...Object.keys(packageJson?.devDependencies ?? {}),
  ]);
  const evidence = [];

  for (const packageName of HTTP_CLIENT_PACKAGES) {
    if (!dependencyNames.has(packageName)) {
      continue;
    }
    evidence.push({
      file: 'package.json',
      reason: `dependency ${packageName} is declared`,
      snippet: packageName,
    });
  }

  return evidence;
}

function getNodeText(sourceFile, node) {
  return node.getText(sourceFile).replace(/\s+/g, ' ').trim();
}

function getImportBindings(importClause) {
  if (!importClause) {
    return [];
  }

  const bindings = [];

  if (importClause.name) {
    bindings.push({
      localName: importClause.name.text,
      importedName: 'default',
      kind: 'default',
    });
  }

  if (importClause.namedBindings && ts.isNamespaceImport(importClause.namedBindings)) {
    bindings.push({
      localName: importClause.namedBindings.name.text,
      importedName: '*',
      kind: 'namespace',
    });
  }

  if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
    for (const element of importClause.namedBindings.elements) {
      bindings.push({
        localName: element.name.text,
        importedName: element.propertyName?.text ?? element.name.text,
        kind: 'named',
      });
    }
  }

  return bindings;
}

function getRuntimeImportSymbol(imported) {
  if (!imported) {
    return null;
  }

  if (imported.kind === 'named') {
    return imported.importedName;
  }

  return imported.localName;
}

function isExported(node) {
  return Boolean(
    ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword),
  );
}

function detectCallStyle(callExpression) {
  const [firstArg, secondArg] = callExpression.arguments;

  if (firstArg && ts.isObjectLiteralExpression(firstArg)) {
    const hasUrlProperty = firstArg.properties.some(
      (property) =>
        ts.isPropertyAssignment(property) &&
        ts.isIdentifier(property.name) &&
        property.name.text === 'url',
    );
    if (hasUrlProperty) {
      return 'request-object';
    }
  }

  if (
    firstArg &&
    (ts.isStringLiteral(firstArg) ||
      firstArg.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral ||
      ts.isTemplateExpression(firstArg)) &&
    secondArg &&
    ts.isObjectLiteralExpression(secondArg)
  ) {
    return 'url-config';
  }

  return 'unknown';
}

function collectPrefix(name) {
  return FUNCTION_PREFIXES.find((prefix) =>
    name === prefix || name.startsWith(`${prefix[0].toUpperCase()}${prefix.slice(1)}`) || name.startsWith(prefix),
  ) ?? null;
}

function collectDtoSuffix(name) {
  return DTO_SUFFIXES.find((suffix) => name.endsWith(suffix)) ?? null;
}

function detectApiLayerBaseDir(rootDir, filePath) {
  const relative = relativePath(rootDir, filePath);
  const segments = relative.split('/');

  if (segments[0] !== 'src') {
    return null;
  }

  if (segments[1] === 'api' || segments[1] === 'apis' || segments[1] === 'services') {
    return `src/${segments[1]}`;
  }

  if (
    (segments[1] === 'features' || segments[1] === 'entities') &&
    segments.length >= 4 &&
    (segments[3] === 'api' || segments[3] === 'apis' || segments[3].startsWith('api.'))
  ) {
    return `src/${segments[1]}/*/${segments[3].replace(/\.(ts|tsx)$/, '')}`;
  }

  if (
    (segments[1] === 'features' || segments[1] === 'entities') &&
    segments.length >= 3 &&
    /^api\.(ts|tsx)$/.test(segments[2])
  ) {
    return `src/${segments[1]}/*/api`;
  }

  return null;
}

function analyzeSourceFile({
  rootDir,
  filePath,
  source,
  signals,
}) {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const importedSymbols = new Map();
  const apiLayerBaseDir = detectApiLayerBaseDir(rootDir, filePath);

  if (apiLayerBaseDir) {
    incrementCounter(signals.apiLayerBaseDirs, apiLayerBaseDir);
    signals.apiLayerEvidence.push(
      createEvidence(rootDir, filePath, `matches API layer pattern ${apiLayerBaseDir}`),
    );
  }

  const visit = (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const importPath = node.moduleSpecifier.text;
      const bindings = getImportBindings(node.importClause);

      if (HTTP_CLIENT_PACKAGES.includes(importPath)) {
        incrementCounter(signals.httpClientImports, importPath);
        signals.httpClientEvidence.push(
          createEvidence(rootDir, filePath, `imports HTTP client package ${importPath}`, getNodeText(sourceFile, node)),
        );
      }

      for (const binding of bindings) {
        importedSymbols.set(binding.localName, {
          importPath,
          importedName: binding.importedName,
          kind: binding.kind,
          localName: binding.localName,
        });

        if (binding.importedName === 'fetchAPI') {
          incrementCounter(signals.fetchApiImportPaths, importPath);
        }

        if (HELPER_SYMBOLS.has(binding.localName) || HELPER_SYMBOLS.has(binding.importedName)) {
          const symbol = binding.kind === 'named' ? binding.importedName : binding.localName;
          const key = `${symbol}\0${importPath}`;
          incrementCounter(signals.helperImports, key);
          signals.helperEvidence.push(
            createEvidence(
              rootDir,
              filePath,
              binding.localName === symbol
                ? `imports API helper ${symbol} from ${importPath}`
                : `imports API helper ${symbol} as ${binding.localName} from ${importPath}`,
              getNodeText(sourceFile, node),
            ),
          );
        }
      }
    }

    if (ts.isCallExpression(node)) {
      let symbol = null;
      let memberName = null;

      if (ts.isIdentifier(node.expression)) {
        symbol = node.expression.text;
      } else if (
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression)
      ) {
        symbol = node.expression.expression.text;
        memberName = node.expression.name.text;
      }

      if (symbol) {
        const imported = importedSymbols.get(symbol);
        const isHelperCall =
          HELPER_SYMBOLS.has(symbol) ||
          imported ||
          (memberName && ['get', 'post', 'put', 'patch', 'delete', 'request'].includes(memberName));

        if (isHelperCall) {
          const importPath = imported?.importPath ?? '<local>';
          const runtimeSymbol = getRuntimeImportSymbol(imported) ?? symbol;
          const key = `${runtimeSymbol}\0${importPath}`;
          const callStyle = memberName ? 'unknown' : detectCallStyle(node);

          incrementCounter(signals.helperCalls, key);
          incrementCounter(signals.callStyles, callStyle);
          signals.callStyleEvidence.push(
            createEvidence(
              rootDir,
              filePath,
              runtimeSymbol === symbol
                ? `calls ${memberName ? `${symbol}.${memberName}` : symbol} as ${callStyle}`
                : `calls ${symbol} for API helper ${runtimeSymbol} as ${callStyle}`,
              getNodeText(sourceFile, node),
            ),
          );
        }

        if (symbol === 'fetch') {
          incrementCounter(signals.fetchCalls, 'fetch');
          signals.httpClientEvidence.push(
            createEvidence(rootDir, filePath, 'calls global fetch', getNodeText(sourceFile, node)),
          );
        }

        if (symbol === 'useQuery' || symbol === 'useMutation') {
          incrementCounter(signals.apiLayerStyles, 'react-query');
        }
      }
    }

    if (ts.isFunctionDeclaration(node) && node.name && isExported(node)) {
      incrementCounter(signals.apiLayerStyles, node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword) ? 'function' : 'function');
      const prefix = collectPrefix(node.name.text);
      if (prefix) {
        incrementCounter(signals.functionPrefixes, prefix);
      }
    }

    if (ts.isVariableStatement(node) && isExported(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) {
          continue;
        }
        incrementCounter(signals.apiLayerStyles, 'function');
        const prefix = collectPrefix(declaration.name.text);
        if (prefix) {
          incrementCounter(signals.functionPrefixes, prefix);
        }
      }
    }

    if (ts.isClassDeclaration(node) && isExported(node)) {
      incrementCounter(signals.apiLayerStyles, 'class');
    }

    if ((ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name) {
      const suffix = collectDtoSuffix(node.name.text);
      if (suffix) {
        incrementCounter(signals.dtoSuffixes, suffix);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
}

function pickHttpClientCandidate(packageEvidence, signals) {
  const counts = new Map();

  for (const evidence of packageEvidence) {
    incrementCounter(counts, evidence.snippet, 2);
  }

  for (const { value, count } of sortedCounts(signals.httpClientImports)) {
    incrementCounter(counts, value, count * 2);
  }

  if ((signals.fetchCalls.get('fetch') ?? 0) > 0) {
    incrementCounter(counts, 'fetch', signals.fetchCalls.get('fetch'));
  }

  const [top] = sortedCounts(counts);
  if (!top) {
    return createCandidate('unknown', 0, []);
  }

  return createCandidate(
    top.value,
    Math.min(1, 0.45 + top.count * 0.15),
    [
      ...packageEvidence.filter((evidence) => evidence.snippet === top.value),
      ...signals.httpClientEvidence.filter((evidence) => evidence.reason.includes(top.value)),
    ].slice(0, 5),
  );
}

function pickApiHelperCandidate(signals) {
  const counts = new Map();
  for (const { value, count } of sortedCounts(signals.helperImports)) {
    incrementCounter(counts, value, count);
  }
  for (const { value, count } of sortedCounts(signals.helperCalls)) {
    incrementCounter(counts, value, count * 2);
  }

  const [top] = sortedCounts(counts);
  if (!top) {
    return createCandidate(
      {
        symbol: 'fetchAPI',
        importPath: '@/shared/api',
        callStyle: 'url-config',
      },
      0.2,
      [],
    );
  }

  const [symbol, importPath] = top.value.split('\0');
  const [topCallStyle] = sortedCounts(
    new Map([...signals.callStyles].filter(([style]) => style !== 'unknown')),
  );
  const callStyle = topCallStyle?.value ?? 'unknown';

  return createCandidate(
    {
      symbol,
      importPath,
      callStyle,
    },
    Math.min(1, 0.45 + top.count * 0.12),
    signals.helperEvidence
      .concat(signals.callStyleEvidence)
      .filter((evidence) => evidence.reason.includes(symbol))
      .slice(0, 8),
  );
}

function pickApiLayerCandidate(signals) {
  const baseDirs = sortedCounts(signals.apiLayerBaseDirs)
    .slice(0, 5)
    .map((entry) => entry.value);
  const [topStyle] = sortedCounts(signals.apiLayerStyles);

  return createCandidate(
    {
      baseDirs,
      style: topStyle?.value ?? 'unknown',
    },
    baseDirs.length > 0 ? Math.min(1, 0.4 + baseDirs.length * 0.1) : 0,
    signals.apiLayerEvidence.slice(0, 8),
  );
}

function pickNamingCandidate(signals) {
  return createCandidate(
    {
      functionPrefixes: sortedCounts(signals.functionPrefixes).map((entry) => entry.value),
      dtoSuffixes: sortedCounts(signals.dtoSuffixes).map((entry) => entry.value),
    },
    signals.functionPrefixes.size > 0 || signals.dtoSuffixes.size > 0 ? 0.65 : 0,
    [],
  );
}

async function analyzeProject(rootDir, options = {}) {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const { roots, files } = await scanTypeScriptFiles(rootDir);
  const packageJson = await readPackageJson(rootDir);
  const packageEvidence = collectPackageDependencyEvidence(rootDir, packageJson);
  const signals = {
    apiLayerBaseDirs: new Map(),
    apiLayerEvidence: [],
    apiLayerStyles: new Map(),
    callStyleEvidence: [],
    callStyles: new Map(),
    dtoSuffixes: new Map(),
    fetchApiImportPaths: new Map(),
    fetchCalls: new Map(),
    functionPrefixes: new Map(),
    helperCalls: new Map(),
    helperEvidence: [],
    helperImports: new Map(),
    httpClientEvidence: [],
    httpClientImports: new Map(),
  };

  for (const filePath of files) {
    const source = await fs.readFile(filePath, 'utf8');
    analyzeSourceFile({
      rootDir,
      filePath,
      source,
      signals,
    });
  }

  const analysisRoot = roots[0] ?? path.resolve(rootDir, 'src');

  return {
    generatedAt,
    root: toPosixPath(rootDir),
    files: {
      scanned: files.length,
      roots: roots.map((root) => relativePath(rootDir, root)),
      analysisRoot: relativePath(rootDir, analysisRoot),
    },
    httpClient: pickHttpClientCandidate(packageEvidence, signals),
    apiHelper: pickApiHelperCandidate(signals),
    apiLayer: pickApiLayerCandidate(signals),
    naming: pickNamingCandidate(signals),
    legacy: {
      fetchApiImportStats: sortedCounts(signals.fetchApiImportPaths).map((entry) => ({
        importPath: entry.value,
        count: entry.count,
      })),
    },
  };
}

export { analyzeProject };
