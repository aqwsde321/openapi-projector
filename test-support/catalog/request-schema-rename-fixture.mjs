function createRequestSchemaRenameSpec({ includePayment = false } = {}) {
  const properties = {
    applyClaim: {
      type: 'string',
    },
    orderItemId: {
      type: 'integer',
      format: 'int64',
    },
    reason: {
      type: 'string',
    },
  };
  const schemas = {
    CreateOrderClaimDto: {
      type: 'object',
      required: ['applyClaim', 'orderItemId', 'reason'],
      properties,
    },
  };

  if (includePayment) {
    properties.deliveryFeePaymentConfirmDto = {
      $ref: '#/components/schemas/PaymentConfirmDto',
    };
    schemas.PaymentConfirmDto = {
      type: 'object',
      properties: {
        paymentKey: {
          type: 'string',
        },
      },
    };
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'Claims API',
      version: '1.0.0',
    },
    paths: {
      '/platform/orders/claims': {
        post: {
          summary: '클레임 신청',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateOrderClaimDto',
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
      schemas,
    },
  };
}

function createDottedRequestSchemaRenameSpec(spec, { required } = {}) {
  const nextSpec = structuredClone(spec);
  nextSpec.paths['/platform/orders/claims'].post.requestBody.content['application/json'].schema = {
    $ref: '#/components/schemas/PlatformOrderClaimController.CreateOrderClaimDto',
  };

  const renamedSchema = {
    ...spec.components.schemas.CreateOrderClaimDto,
  };
  if (required) {
    renamedSchema.required = required;
  }

  nextSpec.components.schemas = {
    'PlatformOrderClaimController.CreateOrderClaimDto': renamedSchema,
  };
  if (spec.components.schemas.PaymentConfirmDto) {
    nextSpec.components.schemas.PaymentConfirmDto = spec.components.schemas.PaymentConfirmDto;
  }

  return nextSpec;
}

export {
  createDottedRequestSchemaRenameSpec,
  createRequestSchemaRenameSpec,
};
