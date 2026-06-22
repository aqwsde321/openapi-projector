function createCollectProjectOperationsSpec() {
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

export { createCollectProjectOperationsSpec };
