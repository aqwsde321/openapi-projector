function createUserOperation(overrides = {}) {
  return {
    tag: 'Users',
    operationId: 'UserController_getUserUsingGET',
    endpointId: 'get-user',
    method: 'get',
    path: '/users/{id}',
    requestContentTypes: [],
    successStatus: '200',
    responseContentTypes: [],
    ...overrides,
  };
}

function createTagDirectoryDedupeOperations() {
  return [
    createUserOperation({
      tag: 'User Admin',
    }),
    createUserOperation({
      tag: 'user-admin',
      endpointId: 'get-user-copy',
      path: '/users/{id}/copy',
    }),
    {
      tag: 'Reports',
      operationId: 'exportReport',
      endpointId: 'export-report',
      method: 'get',
      path: '/reports/export',
      requestContentTypes: [],
      successStatus: '200',
      responseContentTypes: ['text/csv'],
    },
  ];
}

function createFlatDedupeOperations() {
  return [
    createUserOperation(),
    createUserOperation({
      tag: 'Admins',
      endpointId: 'get-admin-user',
      path: '/admins/{id}',
    }),
  ];
}

function summarizeProjectedEndpoints(endpoints) {
  return endpoints.map((endpoint) => ({
    tagDirectoryName: endpoint.tagDirectoryName,
    functionName: endpoint.functionName,
    endpointFileBase: endpoint.endpointFileBase,
    path: endpoint.operation.path,
  }));
}

export {
  createFlatDedupeOperations,
  createTagDirectoryDedupeOperations,
  summarizeProjectedEndpoints,
};
