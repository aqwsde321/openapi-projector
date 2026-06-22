function mergeSchemaRenames(target, source) {
  for (const [previousName, nextName] of source) {
    addSchemaRename(target, previousName, nextName);
  }
}

function addSchemaRename(schemaRenames, previousName, nextName) {
  if (!previousName || !nextName || previousName === nextName) {
    return false;
  }

  const existingNextName = schemaRenames.get(previousName);
  if (existingNextName && existingNextName !== nextName) {
    return false;
  }

  schemaRenames.set(previousName, nextName);
  return !existingNextName;
}

export {
  addSchemaRename,
  mergeSchemaRenames,
};
