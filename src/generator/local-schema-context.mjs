import { collectRefs } from '../openapi/refs.mjs';
import { createTypeRenderer } from './dto/source-renderer.mjs';
import { buildSchemaNameMap } from './local-schema-type-names.mjs';

function buildLocalSchemaContextFromRefs(spec, refs, reservedNames = []) {
  const localSchemaNames = collectLocalSchemaNames(spec, refs);
  const schemaNameMap = buildSchemaNameMap(localSchemaNames, reservedNames);
  const renderer = createTypeRenderer((name) => schemaNameMap.get(name) ?? name);

  return {
    localSchemaNames,
    schemaNameMap,
    renderer,
  };
}

function collectLocalSchemaNames(spec, refs) {
  const localSchemaNames = new Set(
    Array.from(refs)
      .map(getComponentSchemaName)
      .filter((name) => name && spec.components?.schemas?.[name]),
  );
  const queuedSchemaNames = [...localSchemaNames];

  while (queuedSchemaNames.length > 0) {
    const schemaName = queuedSchemaNames.shift();
    const schema = schemaName ? spec.components?.schemas?.[schemaName] : null;

    if (!schema) {
      continue;
    }

    const nestedRefs = new Set();
    collectRefs(schema, nestedRefs);

    for (const nestedRef of nestedRefs) {
      const nestedSchemaName = getComponentSchemaName(nestedRef);
      if (!nestedSchemaName || !spec.components?.schemas?.[nestedSchemaName]) {
        continue;
      }

      if (localSchemaNames.has(nestedSchemaName)) {
        continue;
      }

      localSchemaNames.add(nestedSchemaName);
      queuedSchemaNames.push(nestedSchemaName);
    }
  }

  return Array.from(localSchemaNames).sort((left, right) => left.localeCompare(right));
}

function getComponentSchemaName(ref) {
  if (typeof ref !== 'string' || !ref.startsWith('#/components/schemas/')) {
    return null;
  }

  return ref.split('/').at(-1) ?? null;
}

export {
  buildLocalSchemaContextFromRefs,
};
