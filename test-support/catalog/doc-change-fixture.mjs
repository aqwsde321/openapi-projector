function createCatalogDocChangeSpec({ title = 'Doc Change API' } = {}) {
  return {
    openapi: '3.0.3',
    info: {
      title,
      version: '1.0.0',
    },
    paths: {
      '/users/{id}': {
        get: {
          summary: 'Get user',
          responses: {
            200: {
              description: 'OK',
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
            name: {
              type: 'string',
              description: 'Name',
            },
          },
        },
      },
    },
  };
}

export { createCatalogDocChangeSpec };
