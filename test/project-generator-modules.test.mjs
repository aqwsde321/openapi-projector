import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { classifyProjectOperations } from '../src/openapi/classify-operations.mjs';
import { collectProjectOperations } from '../src/openapi/collect-operations.mjs';
import {
  validateProjectConfig,
  validateProjectRules,
} from '../src/config/validation.mjs';
import { createTypeRenderer } from '../src/core/openapi-utils.mjs';
import {
  buildFieldEntriesFromParameters,
  buildJsDoc,
  renderConcreteNamedSchema,
} from '../src/generator/render-dto.mjs';
import { buildEndpointApplicationReview } from '../src/generator/application-review.mjs';
import { renderOperationSection } from '../src/generator/render-api.mjs';
import { renderOperationHookSection } from '../src/generator/render-hooks.mjs';
import { writeProjectOutputs } from '../src/generator/write-project-output.mjs';
import { buildTagDirectoryName } from '../src/projector/layout.mjs';
import {
  buildOperationSymbolBase,
  createUniqueName,
  toPascalIdentifier,
} from '../src/projector/naming.mjs';
import { projectOperations } from '../src/projector/project-endpoints.mjs';

async function withTempDir(callback) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'openapi-projector-unit-'));
  try {
    return await callback(workspace);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

function buildCollectSpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Unit API',
      version: '1.0.0',
    },
    paths: {
      '/zeta': {
        get: {
          summary: 'Fallback tag',
          responses: {
            204: {
              description: 'No content',
            },
          },
        },
      },
      '/alpha/{id}': {
        parameters: [
          {
            $ref: '#/components/parameters/IdPath',
          },
        ],
        get: {
          tags: ['Alpha'],
          operationId: 'getAlpha',
          parameters: [
            {
              $ref: '#/components/parameters/TraceHeader',
            },
          ],
          responses: {
            200: {
              $ref: '#/components/responses/AlphaResponse',
            },
          },
        },
        post: {
          tags: ['Alpha'],
          operationId: 'createAlpha',
          requestBody: {
            $ref: '#/components/requestBodies/AlphaBody',
          },
          responses: {
            201: {
              $ref: '#/components/responses/AlphaResponse',
            },
          },
        },
      },
    },
    components: {
      parameters: {
        IdPath: {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
        },
        TraceHeader: {
          name: 'x-trace-id',
          in: 'header',
          schema: {
            type: 'string',
          },
        },
      },
      requestBodies: {
        AlphaBody: {
          required: true,
          content: {
            'text/plain': {
              schema: {
                type: 'string',
              },
            },
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        AlphaResponse: {
          description: 'OK',
          content: {
            'text/csv': {
              schema: {
                type: 'string',
              },
            },
            'application/vnd.alpha+json': {
              schema: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

test('collectProjectOperations resolves refs and keeps deterministic path/method order', () => {
  const spec = buildCollectSpec();
  const operations = collectProjectOperations(spec);

  assert.deepEqual(
    operations.map((operation) => `${operation.method} ${operation.path}`),
    ['get /alpha/{id}', 'post /alpha/{id}', 'get /zeta'],
  );
  assert.deepEqual(
    operations.map((operation) => operation.endpointId),
    ['get-alpha-by-id', 'post-alpha-by-id', 'get-zeta'],
  );

  const getAlpha = operations[0];
  assert.equal(getAlpha.tag, 'Alpha');
  assert.deepEqual(
    getAlpha.parameters.map((parameter) => `${parameter.in}:${parameter.name}`),
    ['path:id', 'header:x-trace-id'],
  );
  assert.deepEqual(getAlpha.responseContentTypes, ['text/csv', 'application/vnd.alpha+json']);
  assert.equal(getAlpha.responseMediaType, 'application/vnd.alpha+json');
  assert.equal(getAlpha.successStatus, '200');
  assert.equal(getAlpha.successResponse, spec.components.responses.AlphaResponse);

  const postAlpha = operations[1];
  assert.equal(postAlpha.requestBody, spec.components.requestBodies.AlphaBody);
  assert.deepEqual(postAlpha.requestContentTypes, ['text/plain', 'application/json']);
  assert.equal(postAlpha.requestMediaType, 'application/json');

  const fallback = operations[2];
  assert.equal(fallback.tag, 'default');
  assert.deepEqual(fallback.responseContentTypes, []);
  assert.equal(fallback.successStatus, '204');
});

test('classifyProjectOperations allows json-like, multipart, and empty 2xx bodies', () => {
  const operations = [
    {
      method: 'get',
      path: '/vendor-json',
      requestContentTypes: [],
      successStatus: '200',
      responseContentTypes: ['application/problem+json'],
    },
    {
      method: 'post',
      path: '/uploads',
      requestContentTypes: ['multipart/form-data'],
      successStatus: '201',
      responseContentTypes: ['*/*'],
    },
    {
      method: 'delete',
      path: '/empty',
      requestContentTypes: [],
      successStatus: '204',
      responseContentTypes: [],
    },
    {
      method: 'post',
      path: '/prefers-json',
      requestContentTypes: ['text/plain', 'application/json; charset=utf-8'],
      successStatus: '200',
      responseContentTypes: ['text/csv', 'application/vnd.report+json'],
    },
  ];

  const result = classifyProjectOperations(operations);

  assert.deepEqual(result.supportedOperations, operations);
  assert.deepEqual(result.skippedOperations, []);
});

test('classifyProjectOperations records every unsupported reason on boundary inputs', () => {
  const operations = [
    {
      method: 'post',
      path: '/multi-request',
      requestContentTypes: ['text/plain', 'application/xml'],
      successStatus: '200',
      responseContentTypes: ['application/json'],
    },
    {
      method: 'put',
      path: '/plain-request',
      requestContentTypes: ['text/plain'],
      successStatus: null,
      responseContentTypes: ['text/csv'],
    },
    {
      method: 'get',
      path: '/multi-response',
      requestContentTypes: [],
      successStatus: '200',
      responseContentTypes: ['text/csv', 'application/pdf'],
    },
  ];

  assert.deepEqual(classifyProjectOperations(operations), {
    supportedOperations: [],
    skippedOperations: [
      {
        method: 'POST',
        path: '/multi-request',
        reasons: ['request media types text/plain, application/xml'],
      },
      {
        method: 'PUT',
        path: '/plain-request',
        reasons: [
          'request media type text/plain',
          'missing success response',
          'response media type text/csv',
        ],
      },
      {
        method: 'GET',
        path: '/multi-response',
        reasons: ['response media types text/csv, application/pdf'],
      },
    ],
  });
});

test('buildTagDirectoryName sanitizes title folders and preserves kebab fallback', () => {
  assert.equal(buildTagDirectoryName('Admin: Reports / v1?.  ', 'title'), 'Admin- Reports - v1-');
  assert.equal(buildTagDirectoryName('...   ', 'title'), 'default');
  assert.equal(buildTagDirectoryName('', 'title'), 'default');
  assert.equal(buildTagDirectoryName('Admin Reports / v1', 'kebab'), 'admin-reports-v1');
});

test('validateProjectRules reports unsupported and unsafe boundary values', () => {
  const issues = validateProjectRules({
    api: {
      fetchApiImportPath: '',
      fetchApiSymbol: 'fetch-api',
      fetchApiImportKind: 'namespace',
      adapterStyle: 'axios',
      wrapperGrouping: 'operation',
      tagFileCase: 'snake',
    },
    layout: {
      schemaFileName: '../schema.ts',
    },
  });

  assert.deepEqual(
    issues.map((issue) => issue.path),
    [
      'api.fetchApiImportPath',
      'api.fetchApiSymbol',
      'api.fetchApiImportKind',
      'api.adapterStyle',
      'api.wrapperGrouping',
      'api.tagFileCase',
      'layout.schemaFileName',
    ],
  );
});

test('validateProjectRules requires runtime helper fields after review confirmation', () => {
  const issues = validateProjectRules({
    review: {
      rulesReviewed: true,
    },
    api: {
      wrapperGrouping: 'tag',
      tagFileCase: 'title',
    },
  });

  assert.deepEqual(
    issues.map((issue) => issue.path),
    [
      'api.fetchApiImportPath',
      'api.fetchApiSymbol',
      'api.fetchApiImportKind',
      'api.adapterStyle',
    ],
  );
});

test('validateProjectRules reports invalid React Query hook rules', () => {
  const issues = validateProjectRules({
    hooks: {
      enabled: 'yes',
      library: 'react-query',
      queryMethods: ['GET', 'FETCH'],
      mutationMethods: ['POST', 'GET'],
      queryKeyStrategy: 'constant',
      responseUnwrap: 'body',
      staleTimeImportPath: '@/shared/constant/api',
    },
  });

  assert.deepEqual(
    issues.map((issue) => issue.path),
    [
      'hooks.enabled',
      'hooks.library',
      'hooks.queryMethods[1]',
      'hooks.mutationMethods',
      'hooks.queryKeyStrategy',
      'hooks.responseUnwrap',
      'hooks.staleTimeSymbol',
    ],
  );
});

test('validateProjectConfig reports unsafe project-relative paths', () => {
  const issues = validateProjectConfig({
    sourceUrl: 123,
    sourcePath: '../openapi.json',
    catalogJsonPath: '/tmp/endpoints.json',
    generatedSchemaPath: 'openapi/review/generated/schema.ts',
    projectRulesPath: 'openapi/config/project-rules.jsonc',
    projectGeneratedSrcDir: 'openapi/project/src/openapi-generated',
  });

  assert.deepEqual(
    issues.map((issue) => issue.path),
    ['sourceUrl', 'sourcePath', 'catalogJsonPath'],
  );
});

test('naming helpers strip controller noise, fall back safely, and deduplicate names', () => {
  assert.equal(
    buildOperationSymbolBase({
      operationId: 'AdminUserController_getUserUsingGET',
      endpointId: 'fallback-id',
    }),
    'getUser',
  );
  assert.equal(
    buildOperationSymbolBase({
      operationId: '',
      endpointId: 'get-users-by-id',
    }),
    'getUsersById',
  );
  assert.equal(toPascalIdentifier('getUsersById'), 'GetUsersById');
  assert.equal(toPascalIdentifier(''), 'CallApi');

  const usedNames = new Set(['getUser', 'callApi']);
  assert.equal(createUniqueName('getUser', usedNames), 'getUser2');
  assert.equal(createUniqueName('', usedNames), 'callApi2');
});

test('projectOperations builds deterministic tag directories and endpoint file names', () => {
  const operations = [
    {
      tag: 'User Admin',
      operationId: 'UserController_getUserUsingGET',
      endpointId: 'get-user',
      method: 'get',
      path: '/users/{id}',
      requestContentTypes: [],
      successStatus: '200',
      responseContentTypes: [],
    },
    {
      tag: 'user-admin',
      operationId: 'UserController_getUserUsingGET',
      endpointId: 'get-user-copy',
      method: 'get',
      path: '/users/{id}/copy',
      requestContentTypes: [],
      successStatus: '200',
      responseContentTypes: [],
    },
    {
      tag: 'Reports',
      operationId: 'exportReport',
      endpointId: 'export-report',
      method: 'get',
      path: '/reports/export',
      requestContentTypes: [],
      successStatus: '200',
      responseContentTypes: ['text/csv'],
    },
  ];

  const projection = projectOperations(operations, {
    tagFileCase: 'kebab',
  });

  assert.equal(projection.totalEndpoints, 3);
  assert.equal(projection.generatedEndpoints, 2);
  assert.deepEqual(projection.skippedOperations, [
    {
      method: 'GET',
      path: '/reports/export',
      reasons: ['response media type text/csv'],
    },
  ]);
  assert.deepEqual(
    projection.tagDirectories.map((tagDirectory) => tagDirectory.tagDirectoryName),
    ['user-admin'],
  );
  assert.deepEqual(
    projection.tagDirectories[0].endpoints.map((endpoint) => ({
      tagDirectoryName: endpoint.tagDirectoryName,
      functionName: endpoint.functionName,
      endpointFileBase: endpoint.endpointFileBase,
      path: endpoint.operation.path,
    })),
    [
      {
        tagDirectoryName: 'user-admin',
        functionName: 'getUser',
        endpointFileBase: 'get-user',
        path: '/users/{id}',
      },
      {
        tagDirectoryName: 'user-admin',
        functionName: 'getUser2',
        endpointFileBase: 'get-user2',
        path: '/users/{id}/copy',
      },
    ],
  );
});

test('projectOperations supports flat grouping with global endpoint name dedupe', () => {
  const operations = [
    {
      tag: 'Users',
      operationId: 'UserController_getUserUsingGET',
      endpointId: 'get-user',
      method: 'get',
      path: '/users/{id}',
      requestContentTypes: [],
      successStatus: '200',
      responseContentTypes: [],
    },
    {
      tag: 'Admins',
      operationId: 'UserController_getUserUsingGET',
      endpointId: 'get-admin-user',
      method: 'get',
      path: '/admins/{id}',
      requestContentTypes: [],
      successStatus: '200',
      responseContentTypes: [],
    },
  ];

  const projection = projectOperations(operations, {
    wrapperGrouping: 'flat',
  });

  assert.equal(projection.wrapperGrouping, 'flat');
  assert.deepEqual(projection.tagDirectories, []);
  assert.deepEqual(
    projection.flatEndpoints.map((endpoint) => ({
      tagDirectoryName: endpoint.tagDirectoryName,
      functionName: endpoint.functionName,
      endpointFileBase: endpoint.endpointFileBase,
      path: endpoint.operation.path,
    })),
    [
      {
        tagDirectoryName: null,
        functionName: 'getUser',
        endpointFileBase: 'get-user',
        path: '/users/{id}',
      },
      {
        tagDirectoryName: null,
        functionName: 'getUser2',
        endpointFileBase: 'get-user2',
        path: '/admins/{id}',
      },
    ],
  );
});

test('render DTO helpers escape comments, quote unsafe fields, and avoid nullable interfaces', () => {
  const renderer = createTypeRenderer((name) => name);

  assert.deepEqual(buildJsDoc('line one\nclose */ token'), [
    '/**',
    ' * line one',
    ' * close *\\/ token',
    ' */',
  ]);
  assert.deepEqual(
    buildFieldEntriesFromParameters(
      [
        {
          name: 'x-trace-id',
          in: 'header',
          required: false,
          schema: {
            type: 'string',
          },
          description: 'Trace id',
        },
      ],
      'header',
    ),
    [
      {
        name: 'x-trace-id',
        required: false,
        schema: {
          type: 'string',
        },
        description: 'Trace id',
      },
    ],
  );

  assert.equal(
    renderConcreteNamedSchema(
      'MaybeUser',
      {
        type: 'object',
        nullable: true,
        properties: {
          'user-id': {
            type: 'string',
          },
        },
      },
      renderer,
      'Nullable object',
    ),
    [
      '/**',
      ' * Nullable object',
      ' */',
      'export type MaybeUser = {',
      '  "user-id"?: string;',
      '} | null;',
    ].join('\n'),
  );
});

test('renderOperationSection nests request DTOs when path and body fields collide', () => {
  const spec = {
    components: {
      schemas: {
        UpdateUserPayload: {
          type: 'object',
          required: ['name'],
          properties: {
            id: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
          },
        },
      },
    },
  };
  const operation = {
    method: 'patch',
    path: '/users/{id}',
    summary: 'Update user',
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
        },
      },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/UpdateUserPayload',
          },
        },
      },
    },
    successResponse: {
      description: 'OK',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              ok: {
                type: 'boolean',
              },
            },
          },
        },
      },
    },
  };

  const rendered = renderOperationSection({
    spec,
    operation,
    functionName: 'updateUser',
    dtoImportPath: './update-user.dto',
    runtimeFetchImportPath: '@/shared/api',
    runtimeFetchSymbol: 'request',
    runtimeCallStyle: 'request-object',
  });

  assert.match(rendered.dtoSource, /export interface UpdateUserBody \{/);
  assert.match(rendered.dtoSource, /id\?: string;/);
  assert.match(rendered.dtoSource, /name: string;/);
  assert.match(rendered.dtoSource, /export interface UpdateUserRequestDto \{/);
  assert.match(rendered.dtoSource, /pathParams: \{/);
  assert.match(rendered.dtoSource, /data: UpdateUserBody;/);
  assert.match(rendered.apiSource, /requestDto\.pathParams\["id"\]/);
  assert.match(rendered.apiSource, /data: requestDto\.data/);
  assert.match(rendered.apiSource, /await fetchAPI<UpdateUserResponseDto>\(\{/);
  assert.deepEqual(rendered.apiImports, [
    "import { request as fetchAPI } from '@/shared/api';",
    "import type { UpdateUserRequestDto, UpdateUserResponseDto } from './update-user.dto';",
  ]);
});

test('renderOperationSection can import default runtime helpers', () => {
  const rendered = renderOperationSection({
    spec: {},
    operation: {
      method: 'get',
      path: '/health',
      summary: 'Health',
      parameters: [],
      successResponse: {
        description: 'OK',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ok: {
                  type: 'boolean',
                },
              },
            },
          },
        },
      },
    },
    functionName: 'getHealth',
    dtoImportPath: './get-health.dto',
    runtimeFetchImportPath: '@/shared/api-client',
    runtimeFetchSymbol: 'apiClient',
    runtimeFetchImportKind: 'default',
    runtimeCallStyle: 'url-config',
  });

  assert.deepEqual(rendered.apiImports, [
    "import fetchAPI from '@/shared/api-client';",
    "import type { GetHealthResponseDto } from './get-health.dto';",
  ]);
});

test('renderOperationSection flattens object query parameters into request DTO fields', () => {
  const spec = {
    components: {
      schemas: {
        PageRequest: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
            },
            size: {
              type: 'integer',
            },
          },
        },
        PaymentListFilter: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
            },
            keyword: {
              type: 'string',
            },
          },
        },
      },
    },
  };
  const rendered = renderOperationSection({
    spec,
    operation: {
      method: 'get',
      path: '/payments',
      parameters: [
        {
          name: 'pageable',
          in: 'query',
          schema: {
            $ref: '#/components/schemas/PageRequest',
          },
        },
        {
          name: 'condition',
          in: 'query',
          schema: {
            $ref: '#/components/schemas/PaymentListFilter',
          },
        },
      ],
      successResponse: {
        description: 'OK',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
    },
    functionName: 'getPaymentList',
    dtoImportPath: './get-payment-list.dto',
    runtimeFetchImportPath: '@/shared/api',
    runtimeFetchSymbol: 'fetchAPI',
    runtimeCallStyle: 'url-config',
  });

  assert.match(rendered.dtoSource, /export interface GetPaymentListRequestDto \{/);
  assert.match(rendered.dtoSource, /page\?: number;/);
  assert.match(rendered.dtoSource, /size\?: number;/);
  assert.match(rendered.dtoSource, /status\?: string;/);
  assert.match(rendered.dtoSource, /keyword\?: string;/);
  assert.doesNotMatch(rendered.dtoSource, /export interface PageRequest \{/);
  assert.doesNotMatch(rendered.dtoSource, /export interface PaymentListFilter \{/);
  assert.doesNotMatch(rendered.dtoSource, /pageable\?: PageRequest;/);
  assert.doesNotMatch(rendered.dtoSource, /condition\?: PaymentListFilter;/);
  assert.match(rendered.apiSource, /"page": requestDto\["page"\]/);
  assert.match(rendered.apiSource, /"status": requestDto\["status"\]/);
});

test('renderOperationHookSection uses flattened object query parameter fields in query keys', () => {
  const rendered = renderOperationHookSection({
    spec: {
      components: {
        schemas: {
          PageRequest: {
            type: 'object',
            properties: {
              page: {
                type: 'integer',
              },
            },
          },
          PaymentListFilter: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
              },
            },
          },
        },
      },
    },
    operation: {
      method: 'get',
      path: '/payments',
      parameters: [
        {
          name: 'pageable',
          in: 'query',
          schema: {
            $ref: '#/components/schemas/PageRequest',
          },
        },
        {
          name: 'condition',
          in: 'query',
          schema: {
            $ref: '#/components/schemas/PaymentListFilter',
          },
        },
      ],
      requestBody: null,
    },
    functionName: 'getPaymentList',
    endpointFileBase: 'get-payment-list',
    hookRules: {
      enabled: true,
      queryKeyStrategy: 'path-and-fields',
    },
  });

  assert.match(rendered.hookSource, /const useGetPaymentListQuery = \(params: GetPaymentListRequestDto\) => \{/);
  assert.match(rendered.hookSource, /queryKey: \["\/payments", params\.page, params\.status\],/);
});

test('renderOperationHookSection generates React Query query hooks from hook rules', () => {
  const rendered = renderOperationHookSection({
    spec: {},
    operation: {
      method: 'get',
      path: '/customers',
      parameters: [
        {
          name: 'page',
          in: 'query',
          required: true,
          schema: {
            type: 'integer',
          },
        },
        {
          name: 'membership',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
          },
        },
      ],
      requestBody: null,
    },
    functionName: 'getCustomersList',
    endpointFileBase: 'get-customers-list',
    hookRules: {
      enabled: true,
      queryKeyStrategy: 'path-and-fields',
      responseUnwrap: 'data',
      staleTimeImportPath: '@/shared/constant/api',
      staleTimeSymbol: 'STALE_TIME',
    },
  });

  assert.equal(rendered.hookKind, 'query');
  assert.equal(rendered.hookFileBase, 'get-customers-list.query');
  assert.match(rendered.hookSource, /import \{ useQuery \} from '@tanstack\/react-query';/);
  assert.match(rendered.hookSource, /import \{ STALE_TIME \} from '@\/shared\/constant\/api';/);
  assert.match(rendered.hookSource, /import \{ getCustomersList \} from '\.\/get-customers-list\.api';/);
  assert.match(rendered.hookSource, /import type \{ GetCustomersListRequestDto \} from '\.\/get-customers-list\.dto';/);
  assert.match(
    rendered.hookSource,
    /const useGetCustomersListQuery = \(params: GetCustomersListRequestDto\) => \{/,
  );
  assert.match(
    rendered.hookSource,
    /queryKey: \["\/customers", params\.page, params\.membership\],/,
  );
  assert.match(rendered.hookSource, /return response\.data;/);
  assert.match(rendered.hookSource, /staleTime: STALE_TIME,/);
});

test('renderOperationHookSection generates React Query mutation hooks for write methods', () => {
  const rendered = renderOperationHookSection({
    spec: {},
    operation: {
      method: 'patch',
      path: '/profiles/{id}',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['nickname'],
              properties: {
                nickname: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
      requestMediaType: 'application/json',
    },
    functionName: 'updateProfile',
    endpointFileBase: 'update-profile',
    hookRules: {
      enabled: true,
    },
  });

  assert.equal(rendered.hookKind, 'mutation');
  assert.equal(rendered.hookFileBase, 'update-profile.mutation');
  assert.match(rendered.hookSource, /import \{ useMutation \} from '@tanstack\/react-query';/);
  assert.match(rendered.hookSource, /const useUpdateProfileMutation = \(\) => \{/);
  assert.match(
    rendered.hookSource,
    /mutationFn: \(params: UpdateProfileRequestDto\) => updateProfile\(params\),/,
  );
  assert.match(rendered.hookSource, /export \{ useUpdateProfileMutation \};/);
});

test('buildEndpointApplicationReview preserves nullable enum field types', () => {
  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'Unit API',
      version: '1.0.0',
    },
    paths: {},
    components: {
      schemas: {
        StatusResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['ACTIVE', 'DISABLED'],
              nullable: true,
            },
          },
        },
      },
    },
  };
  const review = buildEndpointApplicationReview({
    spec,
    endpoint: {
      functionName: 'getStatus',
      operation: {
        method: 'get',
        path: '/status',
        parameters: [],
        successStatus: '200',
        responseMediaType: 'application/json',
        successResponse: {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/StatusResponse',
              },
            },
          },
        },
      },
    },
    dtoPath: 'openapi/project/src/openapi-generated/status.dto.ts',
    apiPath: 'openapi/project/src/openapi-generated/status.api.ts',
  });

  assert.deepEqual(review.response.body.fields, [
    {
      name: 'status',
      required: false,
      type: '"ACTIVE" | "DISABLED" | null',
    },
  ]);
});

test('renderOperationSection aliases non-identifier path parameters before URL encoding', () => {
  const rendered = renderOperationSection({
    spec: {},
    operation: {
      method: 'get',
      path: '/users/{user-id}',
      summary: 'Read user',
      parameters: [
        {
          name: 'user-id',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
        },
      ],
      requestBody: null,
      successResponse: {
        description: 'OK',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
    functionName: 'getUser',
    dtoImportPath: './get-user.dto',
    runtimeFetchImportPath: '@/shared/api',
    runtimeFetchSymbol: 'fetchAPI',
    runtimeCallStyle: 'url-config',
  });

  assert.match(rendered.dtoSource, /"user-id": string;/);
  assert.match(rendered.apiSource, /const \{ "user-id": userId \} = requestDto;/);
  assert.match(rendered.apiSource, /\/users\/\$\{encodeURIComponent\(String\(userId\)\)\}/);
  assert.doesNotMatch(rendered.apiSource, /requestDto\["user-id"\]/);
});

test('renderOperationSection uses preferred supported media types when alternatives exist', () => {
  const rendered = renderOperationSection({
    spec: {},
    operation: {
      method: 'post',
      path: '/reports',
      summary: 'Create report',
      parameters: [],
      requestBody: {
        required: true,
        content: {
          'text/plain': {
            schema: {
              type: 'string',
            },
          },
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
      requestMediaType: 'application/json',
      successResponse: {
        description: 'OK',
        content: {
          'text/csv': {
            schema: {
              type: 'string',
            },
          },
          'application/vnd.report+json': {
            schema: {
              type: 'object',
              required: ['id'],
              properties: {
                id: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
      responseMediaType: 'application/vnd.report+json',
    },
    functionName: 'createReport',
    dtoImportPath: './create-report.dto',
    runtimeFetchImportPath: '@/shared/api',
    runtimeFetchSymbol: 'fetchAPI',
    runtimeCallStyle: 'url-config',
  });

  assert.match(rendered.dtoSource, /export interface CreateReportRequestDto \{/);
  assert.match(rendered.dtoSource, /name: string;/);
  assert.match(rendered.dtoSource, /export interface CreateReportResponseDto \{/);
  assert.match(rendered.dtoSource, /id: string;/);
  assert.doesNotMatch(rendered.dtoSource, /export type CreateReportRequestDto = string;/);
  assert.doesNotMatch(rendered.dtoSource, /export type CreateReportResponseDto = string;/);
});

test('writeProjectOutputs throws before writing when the spec has no endpoints', async () => {
  await withTempDir(async (workspace) => {
    const outputDir = path.join(workspace, 'openapi/project/src/openapi-generated');

    await assert.rejects(
      () =>
        writeProjectOutputs({
          rootDir: workspace,
          spec: {
            openapi: '3.0.3',
            info: {
              title: 'Empty',
              version: '1.0.0',
            },
            paths: {},
          },
          schemaSourcePath: path.join(workspace, 'openapi/_internal/source/openapi.json'),
          schemaContents: 'export type Empty = never;\n',
          projectGeneratedSrcDir: outputDir,
          projectManifestPath: path.join(workspace, 'openapi/project/manifest.json'),
          projectSummaryPath: path.join(workspace, 'openapi/project/summary.md'),
          projectRulesPath: 'openapi/config/project-rules.jsonc',
          generatedSchemaPath: 'openapi/review/generated/schema.ts',
          apiRules: {},
          layoutRules: {},
        }),
      /No endpoints found in OpenAPI spec/,
    );
    await assert.rejects(() => fs.access(outputDir), /ENOENT/);
  });
});

test('writeProjectOutputs handles all-skipped specs and custom schema file names', async () => {
  await withTempDir(async (workspace) => {
    const generatedDir = path.join(workspace, 'openapi/project/src/openapi-generated');
    const summaryPath = path.join(workspace, 'openapi/project/summary.md');
    const manifest = await writeProjectOutputs({
      rootDir: workspace,
      spec: {
        openapi: '3.0.3',
        info: {
          title: 'Skipped',
          version: '1.0.0',
        },
        paths: {
          '/reports/export': {
            get: {
              tags: ['Reports'],
              operationId: 'exportReport',
              responses: {
                200: {
                  description: 'CSV',
                  content: {
                    'text/csv': {
                      schema: {
                        type: 'string',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      schemaSourcePath: path.join(workspace, 'openapi/_internal/source/openapi.json'),
      schemaContents: 'export type Contracts = never;\n',
      projectGeneratedSrcDir: generatedDir,
      projectManifestPath: path.join(workspace, 'openapi/project/manifest.json'),
      projectSummaryPath: summaryPath,
      projectRulesPath: 'openapi/config/project-rules.jsonc',
      generatedSchemaPath: 'openapi/review/generated/contracts.ts',
      apiRules: {},
      layoutRules: {
        schemaFileName: 'contracts.ts',
      },
    });

    assert.equal(manifest.totalEndpoints, 1);
    assert.equal(manifest.generatedEndpoints, 0);
    assert.equal(manifest.skippedEndpoints, 1);
    assert.deepEqual(manifest.files, [
      {
        kind: 'schema',
        generated: 'openapi/project/src/openapi-generated/contracts.ts',
      },
    ]);
    assert.deepEqual(manifest.skippedOperations, [
      {
        method: 'GET',
        path: '/reports/export',
        reasons: ['response media type text/csv'],
      },
    ]);

    const summarySource = await fs.readFile(summaryPath, 'utf8');

    assert.match(summarySource, /Generated endpoints: 0/);
    assert.match(summarySource, /`GET \/reports\/export`: response media type text\/csv/);
    await assert.rejects(() => fs.access(path.join(generatedDir, 'index.ts')), /ENOENT/);
    assert.equal(
      await fs.readFile(path.join(generatedDir, 'contracts.ts'), 'utf8'),
      'export type Contracts = never;\n',
    );
    await assert.rejects(() => fs.access(path.join(generatedDir, 'Reports')), /ENOENT/);
  });
});

test('writeProjectOutputs generates React Query hook candidates when hook rules are enabled', async () => {
  await withTempDir(async (workspace) => {
    const generatedDir = path.join(workspace, 'openapi/project/src/openapi-generated');
    const manifest = await writeProjectOutputs({
      rootDir: workspace,
      spec: {
        openapi: '3.0.3',
        info: {
          title: 'Hooks',
          version: '1.0.0',
        },
        paths: {
          '/customers': {
            get: {
              tags: ['Customers'],
              operationId: 'getCustomersList',
              parameters: [
                {
                  name: 'page',
                  in: 'query',
                  required: true,
                  schema: {
                    type: 'integer',
                  },
                },
              ],
              responses: {
                200: {
                  description: 'OK',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          data: {
                            type: 'array',
                            items: {
                              type: 'string',
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '/profiles/{id}': {
            patch: {
              tags: ['Profiles'],
              operationId: 'updateProfile',
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: {
                    type: 'string',
                  },
                },
              ],
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['nickname'],
                      properties: {
                        nickname: {
                          type: 'string',
                        },
                      },
                    },
                  },
                },
              },
              responses: {
                200: {
                  description: 'OK',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'string',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      schemaSourcePath: path.join(workspace, 'openapi/_internal/source/openapi.json'),
      schemaContents: 'export type Contracts = never;\n',
      projectGeneratedSrcDir: generatedDir,
      projectManifestPath: path.join(workspace, 'openapi/project/manifest.json'),
      projectSummaryPath: path.join(workspace, 'openapi/project/summary.md'),
      projectRulesPath: 'openapi/config/project-rules.jsonc',
      generatedSchemaPath: 'openapi/review/generated/schema.ts',
      apiRules: {
        fetchApiImportPath: '@/shared/api',
        fetchApiSymbol: 'fetchAPI',
        wrapperGrouping: 'tag',
      },
      hookRules: {
        enabled: true,
        queryKeyStrategy: 'path-and-fields',
        staleTimeImportPath: '@/shared/constant/api',
        staleTimeSymbol: 'STALE_TIME',
      },
      layoutRules: {},
    });

    assert.deepEqual(
      manifest.files.map((file) => file.generated),
      [
        'openapi/project/src/openapi-generated/schema.ts',
        'openapi/project/src/openapi-generated/Customers/get-customers-list.dto.ts',
        'openapi/project/src/openapi-generated/Customers/get-customers-list.api.ts',
        'openapi/project/src/openapi-generated/Customers/get-customers-list.query.ts',
        'openapi/project/src/openapi-generated/Profiles/update-profile.dto.ts',
        'openapi/project/src/openapi-generated/Profiles/update-profile.api.ts',
        'openapi/project/src/openapi-generated/Profiles/update-profile.mutation.ts',
      ],
    );
    assert.equal(
      manifest.applicationReview.endpoints[0].generatedFiles.hook,
      'openapi/project/src/openapi-generated/Customers/get-customers-list.query.ts',
    );
    assert.equal(
      manifest.applicationReview.endpoints[1].generatedFiles.hook,
      'openapi/project/src/openapi-generated/Profiles/update-profile.mutation.ts',
    );

    const querySource = await fs.readFile(
      path.join(generatedDir, 'Customers/get-customers-list.query.ts'),
      'utf8',
    );
    assert.match(querySource, /import \{ useQuery \} from '@tanstack\/react-query';/);
    assert.match(querySource, /queryKey: \["\/customers", params\.page\],/);
    assert.match(querySource, /staleTime: STALE_TIME,/);

    const mutationSource = await fs.readFile(
      path.join(generatedDir, 'Profiles/update-profile.mutation.ts'),
      'utf8',
    );
    assert.match(mutationSource, /import \{ useMutation \} from '@tanstack\/react-query';/);
    assert.match(
      mutationSource,
      /mutationFn: \(params: UpdateProfileRequestDto\) => updateProfile\(params\),/,
    );
  });
});

test('writeProjectOutputs can generate flat endpoint files without tag folders', async () => {
  await withTempDir(async (workspace) => {
    const generatedDir = path.join(workspace, 'openapi/project/src/openapi-generated');
    const manifest = await writeProjectOutputs({
      rootDir: workspace,
      spec: {
        openapi: '3.0.3',
        info: {
          title: 'Flat',
          version: '1.0.0',
        },
        paths: {
          '/admins/{id}': {
            get: {
              tags: ['Admins'],
              operationId: 'UserController_getUserUsingGET',
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: {
                    type: 'string',
                  },
                },
              ],
              responses: {
                200: {
                  description: 'OK',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'string',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '/users/{id}': {
            get: {
              tags: ['Users'],
              operationId: 'UserController_getUserUsingGET',
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: {
                    type: 'string',
                  },
                },
              ],
              responses: {
                200: {
                  description: 'OK',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          id: {
                            type: 'string',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      schemaSourcePath: path.join(workspace, 'openapi/_internal/source/openapi.json'),
      schemaContents: 'export type Contracts = never;\n',
      projectGeneratedSrcDir: generatedDir,
      projectManifestPath: path.join(workspace, 'openapi/project/manifest.json'),
      projectSummaryPath: path.join(workspace, 'openapi/project/summary.md'),
      projectRulesPath: 'openapi/config/project-rules.jsonc',
      generatedSchemaPath: 'openapi/review/generated/schema.ts',
      apiRules: {
        fetchApiImportPath: '@/shared/api',
        fetchApiSymbol: 'fetchAPI',
        wrapperGrouping: 'flat',
      },
      layoutRules: {},
    });

    assert.equal(manifest.generatedEndpoints, 2);
    assert.deepEqual(
      manifest.files.map((file) => file.generated),
      [
        'openapi/project/src/openapi-generated/schema.ts',
        'openapi/project/src/openapi-generated/get-user.dto.ts',
        'openapi/project/src/openapi-generated/get-user.api.ts',
        'openapi/project/src/openapi-generated/get-user2.dto.ts',
        'openapi/project/src/openapi-generated/get-user2.api.ts',
      ],
    );
    assert.equal(
      await fs.readFile(path.join(generatedDir, 'schema.ts'), 'utf8'),
      'export type Contracts = never;\n',
    );
    await assert.rejects(() => fs.access(path.join(generatedDir, 'index.ts')), /ENOENT/);
    await assert.rejects(() => fs.access(path.join(generatedDir, 'Admins')), /ENOENT/);
    await assert.rejects(() => fs.access(path.join(generatedDir, 'Users')), /ENOENT/);
  });
});
