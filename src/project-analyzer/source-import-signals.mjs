import ts from 'typescript';

import { normalizeImportPath } from './import-path-normalizer.mjs';
import { incrementCounter } from './signal-utils.mjs';
import { recordHelperImportSignal } from './source-helper-import-signals.mjs';
import { recordHttpClientImportSignal } from './source-http-client-import-signals.mjs';
import { getImportBindings } from './source-import-bindings.mjs';

function recordImportBinding(context, binding) {
  const {
    signals,
    importedSymbols,
    importPath,
    normalizedImportPath,
  } = context;

  importedSymbols.set(binding.localName, {
    importPath: normalizedImportPath,
    importedName: binding.importedName,
    kind: binding.kind,
    localName: binding.localName,
    originalImportPath: importPath,
  });

  if (binding.importedName === 'fetchAPI') {
    incrementCounter(signals.fetchApiImportPaths, normalizedImportPath);
  }

  recordHelperImportSignal(context, binding);
}

function recordImportDeclaration({
  node,
  sourceFile,
  rootDir,
  filePath,
  signals,
  importAliases,
  importedSymbols,
}) {
  if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) {
    return;
  }

  const importPath = node.moduleSpecifier.text;
  const normalizedImportPath = normalizeImportPath({
    rootDir,
    filePath,
    importPath,
    importAliases,
  });
  const bindings = getImportBindings(node.importClause);
  const context = {
    node,
    sourceFile,
    rootDir,
    filePath,
    signals,
    importedSymbols,
    importPath,
    normalizedImportPath,
  };

  recordHttpClientImportSignal(context);

  for (const binding of bindings) {
    recordImportBinding(context, binding);
  }
}

export { recordImportDeclaration };
