function createAllSkippedProjectOutputSpec() {
  return {
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
  };
}

export { createAllSkippedProjectOutputSpec };
