import {
  buildOperationRequestContext,
} from '../operation/render-context.mjs';

function getHookRequestContext(spec, operation) {
  const {
    bodyFields,
    canFlattenRequest,
    hasAnyInputs,
    renderRequestAsBodyOnly,
    requestFields,
  } = buildOperationRequestContext(spec, operation);

  return {
    bodyFields,
    canFlattenRequest,
    hasAnyInputs,
    renderRequestAsBodyOnly,
    requestFields,
  };
}

export { getHookRequestContext };
