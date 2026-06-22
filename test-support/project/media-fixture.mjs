function createTypedReportMediaOperation() {
  return {
    tags: ['Reports'],
    operationId: 'createTypedReport',
    requestBody: {
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
            required: ['name'],
            properties: {
              name: {
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
          'text/csv': {
            schema: {
              type: 'string',
            },
          },
          'application/vnd.report+json': {
            schema: {
              type: 'object',
              required: ['id'],
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

function createTypedReportMediaRenderOperation() {
  const operation = createTypedReportMediaOperation();

  return {
    method: 'post',
    path: '/reports',
    summary: 'Create report',
    parameters: [],
    requestBody: operation.requestBody,
    requestMediaType: 'application/json',
    successResponse: operation.responses[200],
    responseMediaType: 'application/vnd.report+json',
  };
}

function addTypedReportMediaAlternatives(spec) {
  spec.paths['/reports/typed'] = {
    post: createTypedReportMediaOperation(),
  };
}

function addWildcardErrorCodesResponse(spec) {
  spec.paths['/__dev/error-codes'] = {
    get: {
      tags: ['Dev'],
      operationId: 'getDevErrorCodes',
      responses: {
        200: {
          description: 'OK',
          content: {
            '*/*': {
              schema: {
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
  };
}

function addMultipartUploadEndpoint(spec) {
  spec.paths['/uploads'] = {
    post: {
      tags: ['Uploads'],
      operationId: 'uploadFile',
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                file: {
                  type: 'string',
                  format: 'binary',
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
              },
            },
          },
        },
      },
    },
  };
}

export {
  addMultipartUploadEndpoint,
  addTypedReportMediaAlternatives,
  addWildcardErrorCodesResponse,
  createTypedReportMediaRenderOperation,
};
