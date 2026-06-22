function addBosBannerEndpoint(spec) {
  spec.paths['/banner'] = {
    get: {
      tags: ['199 - [BOS]원문 노출 API'],
      operationId: 'getBanner',
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: {
                    type: 'number',
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

export { addBosBannerEndpoint };
