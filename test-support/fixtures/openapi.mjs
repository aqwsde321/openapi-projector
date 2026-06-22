function createSimpleSpec(summary = 'Ping') {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Simple API',
      version: '1.0.0',
    },
    paths: {
      '/ping': {
        get: {
          summary,
          responses: {
            200: {
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
        },
      },
    },
  };
}

export { createSimpleSpec };
