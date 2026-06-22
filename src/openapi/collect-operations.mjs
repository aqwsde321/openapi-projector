import {
  buildEndpointCatalog,
  HTTP_METHOD_ORDER,
} from '../catalog/endpoint-catalog.mjs';
import { buildProjectOperation } from './project-operation-builder.mjs';

function collectProjectOperations(spec) {
  const catalogEntries = buildEndpointCatalog(spec);
  const catalogMap = new Map(
    catalogEntries.map((entry) => [`${entry.method} ${entry.path}`, entry]),
  );
  const operations = [];

  for (const endpointPath of Object.keys(spec.paths ?? {}).sort((left, right) =>
    left.localeCompare(right),
  )) {
    const pathItem = spec.paths?.[endpointPath] ?? {};

    for (const method of HTTP_METHOD_ORDER) {
      const operation = pathItem?.[method];

      if (!operation) {
        continue;
      }

      const catalogEntry = catalogMap.get(`${method} ${endpointPath}`);
      operations.push(
        buildProjectOperation({
          catalogEntry,
          endpointPath,
          method,
          operation,
          pathItem,
          spec,
        }),
      );
    }
  }

  return operations;
}

export { collectProjectOperations };
