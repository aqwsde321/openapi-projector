function createResponseSchemaRenameSpec({ idType }) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Claims API',
      version: '1.0.0',
    },
    paths: {
      '/platform/orders/claims': {
        get: {
          summary: '클레임 내역 목록 조회',
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/JsendResponseDtoListClaimListResDto',
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
        JsendResponseDtoListClaimListResDto: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ClaimListResDto',
              },
            },
            message: {
              type: 'string',
            },
            status: {
              type: 'string',
            },
          },
        },
        ClaimListResDto: {
          type: 'object',
          properties: {
            id: {
              type: idType,
            },
          },
        },
      },
    },
  };
}

function createDottedResponseSchemaRenameSpec(spec, { idType }) {
  const nextSpec = structuredClone(spec);
  nextSpec.paths['/platform/orders/claims'].get.responses[200].content['application/json'].schema = {
    $ref: '#/components/schemas/JsendResponseDtoListPlatformOrderClaimController.ClaimListResDto',
  };
  nextSpec.components.schemas = {
    'JsendResponseDtoListPlatformOrderClaimController.ClaimListResDto': {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/PlatformOrderClaimController.ClaimListResDto',
          },
        },
        message: {
          type: 'string',
        },
        status: {
          type: 'string',
        },
      },
    },
    'PlatformOrderClaimController.ClaimListResDto': {
      type: 'object',
      properties: {
        id: {
          type: idType,
        },
      },
    },
  };
  return nextSpec;
}

export {
  createDottedResponseSchemaRenameSpec,
  createResponseSchemaRenameSpec,
};
