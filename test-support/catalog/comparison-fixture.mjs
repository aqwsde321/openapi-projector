function createCatalogComparisonSpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Change Detail API',
      version: '1.0.0',
    },
    paths: {
      '/users/{id}': {
        get: {
          tags: ['Users'],
          summary: 'Get user',
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
              headers: {
                'X-User': {
                  schema: {
                    $ref: '#/components/schemas/User',
                  },
                },
                'X-Meta': {
                  schema: {
                    $ref: '#/components/schemas/ResponseHeader',
                  },
                },
                'X-Changed': {
                  schema: {
                    $ref: '#/components/schemas/ChangedHeader',
                  },
                },
              },
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User',
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            email: {
              type: 'string',
            },
          },
        },
        File: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
          },
        },
        ResponseHeader: {
          type: 'object',
          required: ['value'],
          properties: {
            value: {
              type: 'string',
            },
          },
        },
        ChangedHeader: {
          type: 'object',
          required: ['token'],
          properties: {
            token: {
              type: 'string',
            },
            expiresAt: {
              type: 'string',
            },
          },
        },
      },
    },
  };
}

function createChangedCatalogComparisonSpec(spec) {
  const nextSpec = structuredClone(spec);
  nextSpec.paths['/users/{id}'].get.parameters.push({
    name: 'active',
    in: 'query',
    required: true,
    schema: {
      type: 'boolean',
    },
  });
  nextSpec.components.schemas.User.required = ['email'];
  nextSpec.components.schemas.User.properties.email.type = 'integer';
  nextSpec.components.schemas.User.properties.attachments = {
    type: 'array',
    items: {
      $ref: '#/components/schemas/File',
    },
  };
  delete nextSpec.components.schemas.ResponseHeader.required;
  nextSpec.components.schemas.ResponseHeader.properties.value.type = 'integer';
  nextSpec.components.schemas.ChangedHeader.required.push('expiresAt');
  return nextSpec;
}

export {
  createCatalogComparisonSpec,
  createChangedCatalogComparisonSpec,
};
