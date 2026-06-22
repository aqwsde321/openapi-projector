function hasUnionMember(renderedType, memberName) {
  return renderedType
    .split('|')
    .map((part) => part.trim())
    .includes(memberName);
}

function wrapCompositeArrayItem(renderedType) {
  return renderedType.includes(' | ') || renderedType.includes(' & ')
    ? `(${renderedType})`
    : renderedType;
}

function withNullable(schema, renderedType) {
  if (!schema?.nullable) {
    return renderedType;
  }

  return hasUnionMember(renderedType, 'null') ? renderedType : `${renderedType} | null`;
}

function quotePropertyName(name) {
  return isValidIdentifier(name) ? name : JSON.stringify(name);
}

function isValidIdentifier(name) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name);
}

export {
  quotePropertyName,
  withNullable,
  wrapCompositeArrayItem,
};
