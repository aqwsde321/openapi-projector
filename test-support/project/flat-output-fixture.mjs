function createFlatProjectOutputSpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Flat',
      version: '1.0.0',
    },
    paths: {
      '/admins/{id}': {
        get: createGetUserOperation('Admins'),
      },
      '/users/{id}': {
        get: createGetUserOperation('Users'),
      },
    },
  };
}

function createGetUserOperation(tag) {
  return {
    tags: [tag],
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
  };
}

export { createFlatProjectOutputSpec };
