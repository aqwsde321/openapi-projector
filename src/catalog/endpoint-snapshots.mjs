import { createHash } from 'node:crypto';

import { getOperationParameters } from '../openapi/media.mjs';
import {
  collectComponentSchemaClosure,
  resolveOpenApiNode,
} from '../openapi/refs.mjs';
import { stableStringify } from './diff-utils/stable-stringify.mjs';
import {
  extractDocOnlyFields,
  stripDocOnlyFields,
} from './endpoint-snapshot-doc-fields.mjs';

function createFingerprint(value) {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function buildResolvedEndpointSnapshot(spec, endpointPath, method, pathItem, operation) {
  const parameters = getOperationParameters(spec, pathItem, operation);
  const resolvedRequestBody = resolveOpenApiNode(spec, operation.requestBody);
  const resolvedResponses = Object.fromEntries(
    Object.entries(operation.responses ?? {}).map(([statusCode, response]) => [
      statusCode,
      resolveOpenApiNode(spec, response),
    ]),
  );
  const schemaNames = collectComponentSchemaClosure(spec, {
    parameters,
    requestBody: resolvedRequestBody,
    responses: resolvedResponses,
  });
  const referencedSchemas = Object.fromEntries(
    schemaNames.map((name) => [name, spec.components?.schemas?.[name] ?? null]),
  );

  return {
    method,
    path: endpointPath,
    operation: {
      ...operation,
      parameters,
      requestBody: resolvedRequestBody,
      responses: resolvedResponses,
    },
    referencedSchemas,
  };
}

function buildEndpointSnapshots(spec, endpointPath, method, pathItem, operation) {
  const resolvedSnapshot = buildResolvedEndpointSnapshot(
    spec,
    endpointPath,
    method,
    pathItem,
    operation,
  );
  const contractSnapshot = stripDocOnlyFields(resolvedSnapshot);
  const docSnapshot = extractDocOnlyFields({ operation: resolvedSnapshot.operation });

  return {
    contractFingerprint: createFingerprint(contractSnapshot),
    contractSnapshot,
    docFingerprint: createFingerprint(docSnapshot),
    docSnapshot,
    rawFingerprint: createFingerprint(resolvedSnapshot),
  };
}

export { buildEndpointSnapshots };
