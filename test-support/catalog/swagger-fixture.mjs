const CATEGORY_TAG = '101 - [BOS]카테고리 API';
const CATEGORY_OPERATION_ID = 'createCategory_1';

function createCatalogSwaggerBaseSpec({ title = 'Category API' } = {}) {
  return {
    openapi: '3.0.3',
    info: {
      title,
      version: '1.0.0',
    },
    paths: {
      '/ping': {
        get: {
          summary: 'Ping',
          responses: {
            200: {
              description: 'OK',
            },
          },
        },
      },
    },
  };
}

function createCatalogSwaggerAddedCategorySpec(spec, {
  operationId = CATEGORY_OPERATION_ID,
  summary = '카테고리 생성',
  tag = CATEGORY_TAG,
  withBody = true,
} = {}) {
  const nextSpec = structuredClone(spec);
  nextSpec.paths['/categories'] = {
    post: {
      tags: [tag],
      operationId,
      summary,
      responses: {
        200: {
          description: 'OK',
        },
      },
    },
  };

  if (withBody) {
    nextSpec.paths['/categories'].post.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/CreateCategoryRequest',
          },
        },
      },
    };
    nextSpec.paths['/categories'].post.responses[200].content = {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/CategoryResponse',
        },
      },
    };
    nextSpec.components = {
      schemas: {
        CreateCategoryRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: {
              type: 'string',
            },
            parentId: {
              type: 'integer',
              format: 'int64',
            },
          },
        },
        CategoryResponse: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: {
              type: 'integer',
              format: 'int64',
            },
            name: {
              type: 'string',
            },
          },
        },
      },
    };
  }

  return nextSpec;
}

function createExpectedCatalogSwaggerUrl(sourceUrl) {
  return [
    sourceUrl.replace(/\/v3\/api-docs$/, '/swagger-ui/index.html#/'),
    encodeURIComponent(CATEGORY_TAG),
    `/${CATEGORY_OPERATION_ID}`,
  ].join('');
}

export {
  createCatalogSwaggerAddedCategorySpec,
  createCatalogSwaggerBaseSpec,
  createExpectedCatalogSwaggerUrl,
};
