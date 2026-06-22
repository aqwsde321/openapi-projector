import { schemaStructuralSignature } from './structural-signature.mjs';

function detectEquivalentSchemaRenames(previousSchemas = {}, nextSchemas = {}) {
  const previousNames = Object.keys(previousSchemas ?? {})
    .filter((name) => !Object.hasOwn(nextSchemas ?? {}, name));
  const nextNames = Object.keys(nextSchemas ?? {})
    .filter((name) => !Object.hasOwn(previousSchemas ?? {}, name));
  const previousBySignature = groupSchemaNamesBySignature(previousNames, previousSchemas);
  const nextBySignature = groupSchemaNamesBySignature(nextNames, nextSchemas);
  const renames = new Map();

  for (const [signature, removedNames] of previousBySignature) {
    const addedNames = nextBySignature.get(signature) ?? [];

    if (removedNames.length === 1 && addedNames.length === 1) {
      renames.set(removedNames[0], addedNames[0]);
      continue;
    }

    for (const removedName of removedNames) {
      const displayNameMatches = addedNames.filter(
        (addedName) => getSchemaDisplayName(addedName) === getSchemaDisplayName(removedName),
      );

      if (displayNameMatches.length === 1) {
        renames.set(removedName, displayNameMatches[0]);
      }
    }
  }

  return renames;
}

function groupSchemaNamesBySignature(schemaNames, schemas) {
  const grouped = new Map();

  for (const schemaName of schemaNames) {
    const signature = schemaStructuralSignature(schemaName, schemas);
    const names = grouped.get(signature) ?? [];
    names.push(schemaName);
    grouped.set(signature, names);
  }

  return grouped;
}

function getSchemaDisplayName(schemaName) {
  return String(schemaName).split('.').at(-1) || String(schemaName);
}

export {
  detectEquivalentSchemaRenames,
  getSchemaDisplayName,
};
