function createEnumContractSpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Enum Change API',
      version: '1.0.0',
    },
    paths: {
      '/claims': {
        get: {
          summary: 'List claims',
          parameters: [
            {
              name: 'condition',
              in: 'query',
              schema: {
                $ref: '#/components/schemas/ClaimSearchCondition',
              },
            },
          ],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ClaimResponse',
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
        ClaimSearchCondition: {
          type: 'object',
          properties: {
            claimStatuses: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['WAITING'],
              },
            },
            itemTypes: {
              type: 'array',
              enum: ['SINGLE', 'SET'],
              items: {
                type: 'string',
                enum: ['SINGLE', 'SET'],
              },
            },
            productTypes: {
              type: 'array',
              enum: ['MIXED', 'OPTION_SET', 'SINGLE'],
              items: {
                type: 'string',
                enum: ['MIXED', 'OPTION_SET', 'SINGLE'],
              },
            },
          },
        },
        ClaimResponse: {
          type: 'object',
          properties: {
            claimStatus: {
              type: 'string',
              enum: ['WAITING', 'APPROVED'],
            },
          },
        },
      },
    },
  };
}

function createChangedEnumContractSpec(spec) {
  const nextSpec = structuredClone(spec);
  nextSpec.components.schemas.ClaimSearchCondition.properties.claimStatuses.items.enum = [
    'WAITING',
    'APPROVED',
  ];
  nextSpec.components.schemas.ClaimSearchCondition.properties.itemTypes.enum = [
    'SINGLE',
  ];
  nextSpec.components.schemas.ClaimSearchCondition.properties.itemTypes.items.enum = [
    'SINGLE',
  ];
  nextSpec.components.schemas.ClaimSearchCondition.properties.productTypes.items.enum = [
    'MIXED',
    'OPTION_SET',
    'SET',
    'SINGLE',
  ];
  nextSpec.components.schemas.ClaimSearchCondition.properties.newStatuses = {
    type: 'array',
    enum: ['WAITING'],
    items: {
      type: 'string',
      enum: ['WAITING'],
    },
  };
  nextSpec.components.schemas.ClaimResponse.properties.claimStatus.enum = [
    'WAITING',
  ];
  return nextSpec;
}

const EXPECTED_ENUM_CONTRACT_TABLE_ROWS = [
  {
    change: '🟢 추가',
    location: '요청 Query 파라미터 enum 값',
    previous: '없음',
    next: 'claimStatuses: APPROVED',
  },
  {
    change: '🔴 삭제',
    location: '요청 Query 파라미터 enum 값',
    previous: 'itemTypes: SET',
    next: '없음',
  },
  {
    change: '🟢 추가',
    location: '요청 Query 파라미터 enum 값',
    previous: '없음',
    next: 'productTypes: SET',
  },
  {
    change: '🟢 추가',
    location: '요청 Query 파라미터 필드',
    previous: '없음',
    next: 'newStatuses: List<String> (optional, enum: WAITING)',
  },
  {
    change: '🔴 삭제',
    location: '응답 Body enum 값',
    previous: 'claimStatus: APPROVED',
    next: '없음',
  },
];

export {
  EXPECTED_ENUM_CONTRACT_TABLE_ROWS,
  createChangedEnumContractSpec,
  createEnumContractSpec,
};
