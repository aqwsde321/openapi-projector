import ts from 'typescript';

import { recordCallExpression } from './source-call-signals.mjs';
import { recordDeclarationSignals } from './source-declaration-signals.mjs';
import { recordImportDeclaration } from './source-import-signals.mjs';
import { recordApiLayerBaseDir } from './source-layer-signals.mjs';

function analyzeSourceFile({
  rootDir,
  filePath,
  source,
  signals,
  importAliases,
}) {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const importedSymbols = new Map();
  recordApiLayerBaseDir({ rootDir, filePath, signals });

  const visit = (node) => {
    recordImportDeclaration({
      node,
      sourceFile,
      rootDir,
      filePath,
      signals,
      importAliases,
      importedSymbols,
    });
    recordCallExpression({
      node,
      sourceFile,
      rootDir,
      filePath,
      signals,
      importedSymbols,
    });

    recordDeclarationSignals(node, signals);

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
}

export { analyzeSourceFile };
