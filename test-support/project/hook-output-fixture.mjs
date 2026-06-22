function createHookOutputSpec() {
  return {
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
  };
}

export { createHookOutputSpec };
