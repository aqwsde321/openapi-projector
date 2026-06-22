function getByRef(spec, ref) {
  return ref
    .replace(/^#\//, '')
    .split('/')
    .reduce((current, segment) => current?.[segment], spec);
}

function resolveOpenApiNode(spec, value) {
  if (!value || typeof value !== 'object' || !value.$ref) {
    return value ?? null;
  }

  return getByRef(spec, value.$ref) ?? null;
}

function collectRefs(value, refs = new Set()) {
  if (!value || typeof value !== 'object') {
    return refs;
  }

  if (typeof value.$ref === 'string') {
    refs.add(value.$ref);
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectRefs(item, refs));
    return refs;
  }

  Object.values(value).forEach((item) => collectRefs(item, refs));
  return refs;
}

function schemaRefName(ref) {
  return String(ref).split('/').at(-1);
}

function collectComponentSchemaClosure(spec, value) {
  const schemaNames = new Set();
  const pendingRefs = [...collectRefs(value, new Set())];

  while (pendingRefs.length > 0) {
    const ref = pendingRefs.shift();
    if (!ref?.startsWith('#/components/schemas/')) {
      continue;
    }

    const name = schemaRefName(ref);
    if (!name || schemaNames.has(name) || !spec.components?.schemas?.[name]) {
      continue;
    }

    schemaNames.add(name);
    const schema = spec.components.schemas[name];
    for (const nestedRef of collectRefs(schema, new Set())) {
      pendingRefs.push(nestedRef);
    }
  }

  return Array.from(schemaNames).sort((left, right) => left.localeCompare(right));
}

export {
  collectComponentSchemaClosure,
  collectRefs,
  getByRef,
  resolveOpenApiNode,
  schemaRefName,
};
