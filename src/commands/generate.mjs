import path from 'node:path';

import {
  buildEndpointCatalog,
  cleanDir,
  findPrimaryResponse,
  getByRef,
  getOperationParameters,
  loadProjectConfig,
  normalizeText,
  writeText,
} from '../core/openapi-utils.mjs';
import { generateSchemaTypes } from '../openapi/generate-schema-types.mjs';
import {
  loadSupportedOpenApiSpec,
  resolveGeneratedSchemaPath,
  toFileUrl,
} from '../openapi/load-spec.mjs';

function resolveRequestBody(spec, requestBody) {
  if (!requestBody) {
    return null;
  }

  return requestBody.$ref ? getByRef(spec, requestBody.$ref) : requestBody;
}

function resolveResponse(spec, response) {
  if (!response) {
    return null;
  }

  return response.$ref ? getByRef(spec, response.$ref) : response;
}

function renderFieldList(items) {
  if (items.length === 0) {
    return '- 없음';
  }

  return items.map((item) => `- ${item}`).join('\n');
}

function renderParameterSection(parameters) {
  if (parameters.length === 0) {
    return '- 없음';
  }

  return parameters
    .map((parameter) => {
      const requiredText = parameter.required ? 'required' : 'optional';
      const schemaType = parameter.schema?.type ?? (parameter.schema?.$ref ? 'ref' : 'unknown');
      const description = normalizeText(parameter.description);
      return `- \`${parameter.in}.${parameter.name}\` (${requiredText}, ${schemaType})${description ? ` - ${description}` : ''}`;
    })
    .join('\n');
}

function renderEndpointDoc({ entry, spec }) {
  const pathItem = spec.paths?.[entry.path] ?? {};
  const operation = pathItem?.[entry.method];
  const parameters = operation ? getOperationParameters(spec, pathItem, operation) : [];
  const requestBody = resolveRequestBody(spec, operation?.requestBody);
  const [successStatus, successResponseRaw] = findPrimaryResponse(operation?.responses ?? {});
  const successResponse = resolveResponse(spec, successResponseRaw);
  const requestMediaTypes = Object.keys(requestBody?.content ?? {});
  const responseMediaTypes = Object.keys(successResponse?.content ?? {});
  const tags = Array.isArray(operation?.tags) ? operation.tags : [];

  return [
    `# ${entry.id}`,
    '',
    `- Method: \`${entry.method.toUpperCase()}\``,
    `- Path: \`${entry.path}\``,
    `- OperationId: ${entry.operationId ? `\`${entry.operationId}\`` : '(none)'}`,
    `- Tags: ${tags.length > 0 ? tags.map((tag) => `\`${tag}\``).join(', ') : '(none)'}`,
    '',
    '## Summary',
    '',
    entry.summary || '(none)',
    '',
    '## Description',
    '',
    entry.description || '(none)',
    '',
    '## Parameters',
    '',
    renderParameterSection(parameters),
    '',
    '## Request Body',
    '',
    requestBody
      ? renderFieldList([
          `Required: ${requestBody.required ? 'yes' : 'no'}`,
          `Media Types: ${
            requestMediaTypes.length > 0
              ? requestMediaTypes.map((item) => `\`${item}\``).join(', ')
              : '(none)'
          }`,
        ])
      : '- 없음',
    '',
    '## Success Response',
    '',
    successStatus
      ? renderFieldList([
          `Status: \`${successStatus}\``,
          `Media Types: ${
            responseMediaTypes.length > 0
              ? responseMediaTypes.map((item) => `\`${item}\``).join(', ')
              : '(none)'
          }`,
        ])
      : '- 없음',
    '',
  ].join('\n');
}

const generateCommand = {
  name: 'generate',
  async run() {
    const rootDir = process.cwd();
    const { projectConfig } = await loadProjectConfig(rootDir);
    const sourcePath = path.resolve(rootDir, projectConfig.sourcePath);
    const docsDir = path.resolve(rootDir, projectConfig.docsDir);
    const generatedSchemaPath = resolveGeneratedSchemaPath(rootDir, projectConfig);
    const reviewGeneratedDir = path.dirname(generatedSchemaPath);
    const legacyEndpointsDir = projectConfig.endpointsDir
      ? path.resolve(rootDir, projectConfig.endpointsDir)
      : null;

    const spec = await loadSupportedOpenApiSpec(sourcePath);
    const endpoints = buildEndpointCatalog(spec);
    const schemaSource = await generateSchemaTypes(toFileUrl(sourcePath));

    await cleanDir(docsDir);
    await cleanDir(reviewGeneratedDir);
    if (legacyEndpointsDir) {
      await cleanDir(legacyEndpointsDir);
    }

    for (const entry of endpoints) {
      const filePath = path.join(docsDir, `${entry.id}.md`);
      await writeText(filePath, renderEndpointDoc({ entry, spec }));
    }

    await writeText(
      generatedSchemaPath,
      schemaSource.endsWith('\n') ? schemaSource : `${schemaSource}\n`,
    );

    console.log(`Generated ${endpoints.length} review doc(s) into ${docsDir}`);
    console.log(`Generated schema types into ${generatedSchemaPath}`);
    if (legacyEndpointsDir) {
      console.log(`Cleared legacy endpoint helper directory: ${legacyEndpointsDir}`);
    }
  },
};

export { generateCommand };
