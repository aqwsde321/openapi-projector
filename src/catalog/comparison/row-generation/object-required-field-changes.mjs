function getSchemaRequiredFieldChanges(schemaName, detail, changedPropertyNames) {
  const previousValue = detail.kind === 'added' ? [] : detail.previous;
  const nextValue = detail.kind === 'removed' ? [] : detail.next;

  if (!Array.isArray(previousValue) || !Array.isArray(nextValue)) {
    return [];
  }

  const previousRequired = new Set(previousValue.map(String));
  const nextRequired = new Set(nextValue.map(String));
  const fieldNames = new Set([...previousRequired, ...nextRequired]);

  return [...fieldNames]
    .sort((left, right) => left.localeCompare(right))
    .filter(
      (fieldName) => !changedPropertyNames.has(`${schemaName}.${fieldName}`),
    )
    .map((fieldName) => ({
      fieldName,
      wasRequired: previousRequired.has(fieldName),
      isRequired: nextRequired.has(fieldName),
    }))
    .filter(({ wasRequired, isRequired }) => wasRequired !== isRequired);
}

export { getSchemaRequiredFieldChanges };
