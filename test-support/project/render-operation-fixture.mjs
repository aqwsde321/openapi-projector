function createCollidingUpdateUserSpec() {
  return {
    components: {
      schemas: {
        UpdateUserPayload: {
          type: 'object',
          required: ['name'],
          properties: {
            id: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
          },
        },
      },
    },
  };
}

function createCollidingUpdateUserOperation() {
  return {
    method: 'patch',
    path: '/users/{id}',
    summary: 'Update user',
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
            $ref: '#/components/schemas/UpdateUserPayload',
          },
        },
      },
    },
    successResponse: createObjectResponse({
      ok: {
        type: 'boolean',
      },
    }),
  };
}

function createObjectQueryParamsSpec() {
  return {
    components: {
      schemas: {
        PageRequest: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
            },
            size: {
              type: 'integer',
            },
          },
        },
        PaymentListFilter: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
            },
            keyword: {
              type: 'string',
            },
          },
        },
      },
    },
  };
}

function createObjectQueryParamsOperation() {
  return {
    method: 'get',
    path: '/payments',
    parameters: [
      {
        name: 'pageable',
        in: 'query',
        schema: {
          $ref: '#/components/schemas/PageRequest',
        },
      },
      {
        name: 'condition',
        in: 'query',
        schema: {
          $ref: '#/components/schemas/PaymentListFilter',
        },
      },
    ],
    successResponse: createObjectResponse({
      items: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
    }),
  };
}

function createObjectResponse(properties) {
  return {
    description: 'OK',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties,
        },
      },
    },
  };
}

export {
  createCollidingUpdateUserOperation,
  createCollidingUpdateUserSpec,
  createObjectQueryParamsOperation,
  createObjectQueryParamsSpec,
};
