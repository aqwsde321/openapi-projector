import assert from 'node:assert/strict';
import test from 'node:test';

import { buildEndpointApplicationReview } from '#src/generator/review.mjs';

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
