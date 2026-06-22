import ts from 'typescript';

import { incrementCounter } from './signal-utils.mjs';
import { collectDtoSuffix, collectPrefix } from './source-declaration-names.mjs';

function isExported(node) {
  return Boolean(
    ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword),
  );
}

function recordExportedFunctionName(signals, name) {
  incrementCounter(signals.apiLayerStyles, 'function');

  const prefix = collectPrefix(name);
  if (prefix) {
    incrementCounter(signals.functionPrefixes, prefix);
  }
}

function recordExportedFunctionDeclaration(node, signals) {
  if (ts.isFunctionDeclaration(node) && node.name && isExported(node)) {
    recordExportedFunctionName(signals, node.name.text);
  }
}

function recordExportedVariableStatement(node, signals) {
  if (!ts.isVariableStatement(node) || !isExported(node)) {
    return;
  }

  for (const declaration of node.declarationList.declarations) {
    if (ts.isIdentifier(declaration.name)) {
      recordExportedFunctionName(signals, declaration.name.text);
    }
  }
}

function recordExportedClassDeclaration(node, signals) {
  if (ts.isClassDeclaration(node) && isExported(node)) {
    incrementCounter(signals.apiLayerStyles, 'class');
  }
}

function recordDtoDeclaration(node, signals) {
  if (!((ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name)) {
    return;
  }

  const suffix = collectDtoSuffix(node.name.text);
  if (suffix) {
    incrementCounter(signals.dtoSuffixes, suffix);
  }
}

function recordDeclarationSignals(node, signals) {
  recordExportedFunctionDeclaration(node, signals);
  recordExportedVariableStatement(node, signals);
  recordExportedClassDeclaration(node, signals);
  recordDtoDeclaration(node, signals);
}

export { recordDeclarationSignals };
