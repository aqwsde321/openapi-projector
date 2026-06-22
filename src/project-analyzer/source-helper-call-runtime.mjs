function getRuntimeImportSymbol(imported) {
  if (!imported) {
    return null;
  }

  if (imported.kind === 'named') {
    return imported.importedName;
  }

  return imported.localName;
}

function getRuntimeImportKind(imported) {
  if (!imported) {
    return 'local';
  }

  return imported.kind;
}

export { getRuntimeImportKind, getRuntimeImportSymbol };
