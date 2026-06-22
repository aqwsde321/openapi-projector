function createRequiredNoiseSpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Notification API',
      version: '1.0.0',
    },
    paths: {
      '/bos/notifications/case-settings': {
        post: {
          summary: '알림 템플릿 등록 Swagger',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateCaseSettingRequest',
                },
              },
            },
          },
          responses: {
            200: {
              description: 'OK',
            },
          },
        },
        put: {
          summary: '알림 템플릿 수정 Swagger',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UpdateCaseSettingRequest',
                },
              },
            },
          },
          responses: {
            200: {
              description: 'OK',
            },
          },
        },
      },
      '/bos/notifications/case-settings/detail': {
        get: {
          summary: '알림 템플릿 상세 조회 Swagger',
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/CaseSettingDetailResponse',
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
        CreateCaseSettingRequest: {
          type: 'object',
          properties: {
            targetItems: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/CreateTargetItem',
              },
            },
          },
        },
        UpdateCaseSettingRequest: {
          type: 'object',
          properties: {
            targetItems: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/UpdateTargetItem',
              },
            },
          },
        },
        CaseSettingDetailResponse: {
          type: 'object',
          properties: {
            targetItems: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/DetailTargetItem',
              },
            },
          },
        },
        CreateTargetItem: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              enum: ['SMS', 'ALIMTALK', 'EMAIL'],
            },
          },
        },
        UpdateTargetItem: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              enum: ['SMS', 'ALIMTALK', 'EMAIL'],
            },
          },
        },
        DetailTargetItem: {
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              enum: ['SMS', 'ALIMTALK', 'EMAIL'],
            },
          },
        },
      },
    },
  };
}

function createChangedRequiredNoiseSpec(spec) {
  const nextSpec = structuredClone(spec);
  nextSpec.components.schemas.CreateTargetItem.required = ['channel'];
  nextSpec.components.schemas.UpdateTargetItem.required = ['channel'];
  nextSpec.components.schemas.DetailTargetItem.required = ['channel'];
  return nextSpec;
}

function createRenamedRequiredNoiseSpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Claims API',
      version: '1.0.0',
    },
    paths: {
      '/bos/orders/claims/confirm': {
        post: {
          summary: '클레임 승인/반려 처리',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ConfirmClaimDto',
                },
              },
            },
          },
          responses: {
            200: {
              description: 'OK',
            },
          },
        },
      },
    },
    components: {
      schemas: {
        ConfirmClaimDto: {
          type: 'object',
          required: ['orderItemIdList', 'permission'],
          properties: {
            orderItemIdList: {
              type: 'array',
              items: {
                type: 'integer',
                format: 'int64',
              },
            },
            permission: {
              type: 'boolean',
            },
          },
        },
      },
    },
  };
}

function createChangedRenamedRequiredNoiseSpec(spec) {
  const nextSpec = structuredClone(spec);
  nextSpec.paths['/bos/orders/claims/confirm'].post.requestBody.content['application/json'].schema = {
    $ref: '#/components/schemas/BosConfirmClaimDto',
  };
  nextSpec.components.schemas = {
    BosConfirmClaimDto: {
      type: 'object',
      required: ['orderItemId', 'permission'],
      properties: {
        orderItemId: {
          type: 'integer',
          format: 'int64',
        },
        permission: {
          type: 'boolean',
        },
      },
    },
  };
  return nextSpec;
}

function createRemovedNestedRequiredNoiseSpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Removed Nested Schema API',
      version: '1.0.0',
    },
    paths: {
      '/products': {
        post: {
          summary: 'Create product',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ProductRequest',
                },
              },
            },
          },
          responses: {
            200: {
              description: 'OK',
            },
          },
        },
      },
    },
    components: {
      schemas: {
        ProductRequest: {
          type: 'object',
          properties: {
            setComponentList: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/SetComponent',
              },
            },
          },
        },
        SetComponent: {
          type: 'object',
          required: ['refProductId'],
          properties: {
            refProductId: {
              type: 'integer',
              format: 'int64',
            },
          },
        },
      },
    },
  };
}

function createChangedRemovedNestedRequiredNoiseSpec(spec) {
  const nextSpec = structuredClone(spec);
  delete nextSpec.components.schemas.ProductRequest.properties.setComponentList;
  delete nextSpec.components.schemas.SetComponent;
  return nextSpec;
}

export {
  createChangedRemovedNestedRequiredNoiseSpec,
  createChangedRenamedRequiredNoiseSpec,
  createChangedRequiredNoiseSpec,
  createRemovedNestedRequiredNoiseSpec,
  createRenamedRequiredNoiseSpec,
  createRequiredNoiseSpec,
};
