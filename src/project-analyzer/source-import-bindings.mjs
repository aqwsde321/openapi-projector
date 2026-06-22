import ts from 'typescript';

function getDefaultImportBinding(importClause) {
  if (!importClause.name) {
    return null;
  }

  return {
    localName: importClause.name.text,
    importedName: 'default',
    kind: 'default',
  };
}

function getNamespaceImportBinding(namedBindings) {
  if (!namedBindings || !ts.isNamespaceImport(namedBindings)) {
    return null;
  }

  return {
    localName: namedBindings.name.text,
    importedName: '*',
    kind: 'namespace',
  };
}

function getNamedImportBindings(namedBindings) {
  if (!namedBindings || !ts.isNamedImports(namedBindings)) {
    return [];
  }

  return namedBindings.elements.map((element) => ({
    localName: element.name.text,
    importedName: element.propertyName?.text ?? element.name.text,
    kind: 'named',
  }));
}

function getImportBindings(importClause) {
  if (!importClause) {
    return [];
  }

  const bindings = [];
  const defaultBinding = getDefaultImportBinding(importClause);
  const namespaceBinding = getNamespaceImportBinding(importClause.namedBindings);

  if (defaultBinding) {
    bindings.push(defaultBinding);
  }

  if (namespaceBinding) {
    bindings.push(namespaceBinding);
  }

  bindings.push(...getNamedImportBindings(importClause.namedBindings));

  return bindings;
}

export { getImportBindings };
