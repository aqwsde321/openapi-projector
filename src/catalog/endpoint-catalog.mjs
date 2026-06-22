import { normalizeText } from '../core/text-utils.mjs';
import {
  buildEndpointIdFromPath,
  createUniqueId,
} from './endpoint-id.mjs';
import { buildEndpointSnapshots } from './endpoint-snapshots.mjs';

const HTTP_METHOD_ORDER = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
  'trace',
];

function buildOperationKey(method, endpointPath) {
  return `${String(method).toLowerCase()} ${endpointPath}`;
}

function buildEndpointCatalog(spec) {
  const entries = [];
  const usedIds = new Set();
  const paths = Object.keys(spec.paths ?? {}).sort((left, right) =>
    left.localeCompare(right),
  );

  for (const endpointPath of paths) {
    const pathItem = spec.paths?.[endpointPath] ?? {};

    for (const method of HTTP_METHOD_ORDER) {
      const operation = pathItem?.[method];

      if (!operation) {
        continue;
      }

      const baseId = buildEndpointIdFromPath(method, endpointPath);
      const {
        contractFingerprint,
        contractSnapshot,
        docFingerprint,
        docSnapshot,
        rawFingerprint,
      } = buildEndpointSnapshots(
        spec,
        endpointPath,
        method,
        pathItem,
        operation,
      );

      entries.push({
        id: createUniqueId(baseId, usedIds),
        method,
        path: endpointPath,
        summary: normalizeText(operation.summary),
        description: normalizeText(operation.description),
        operationId: operation.operationId ?? null,
        tags: Array.isArray(operation.tags) ? operation.tags : [],
        rawFingerprint,
        contractFingerprint,
        docFingerprint,
        contractSnapshot,
        docSnapshot,
      });
    }
  }

  return entries;
}

export {
  HTTP_METHOD_ORDER,
  buildEndpointCatalog,
  buildOperationKey,
};
