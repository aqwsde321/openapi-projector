import { toPascalCase } from '../core/text-utils.mjs';

function buildSchemaNameMap(localSchemaNames, reservedNames = []) {
  const usedTypeNames = new Set(reservedNames);

  return new Map(
    localSchemaNames.map((name) => [
      name,
      createUniqueTypeName(shortenSchemaTypeName(name), usedTypeNames),
    ]),
  );
}

function splitTypeNameTokens(value) {
  return String(value).match(/[A-Z]+(?=[A-Z][a-z]|[0-9]|$)|[A-Z]?[a-z]+|[0-9]+/g) ?? [];
}

function shortenSchemaTypeName(name) {
  const tokens = splitTypeNameTokens(name).filter((token) => token !== 'Dto');
  const used = new Set();
  const compacted = [];

  for (const token of tokens) {
    const normalized = token.toLowerCase();
    if (used.has(normalized)) {
      continue;
    }
    used.add(normalized);
    compacted.push(token);
  }

  return compacted.join('') || toPascalCase(name);
}

function createUniqueTypeName(baseName, usedNames) {
  const normalizedBaseName = toPascalCase(baseName || 'GeneratedType');
  let candidate = normalizedBaseName;
  let index = 2;

  while (usedNames.has(candidate)) {
    candidate = `${normalizedBaseName}${index}`;
    index += 1;
  }

  usedNames.add(candidate);
  return candidate;
}

export {
  buildSchemaNameMap,
};
