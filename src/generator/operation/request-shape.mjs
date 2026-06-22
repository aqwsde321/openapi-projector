import {
  buildFieldEntriesFromSchema,
  hasDuplicateFieldNames,
} from '../dto/source-renderer.mjs';
import { isSimpleObjectSchema } from '../dto/schema-utils.mjs';

function buildOperationRequestShape({
  requestSchema,
  pathFields,
  queryFields,
  headerFields,
  cookieFields,
}) {
  const bodyFields =
    requestSchema && isSimpleObjectSchema(requestSchema)
      ? buildFieldEntriesFromSchema(requestSchema)
      : [];
  const hasRequestBody = Boolean(requestSchema);
  const hasAnyParams =
    pathFields.length > 0 ||
    queryFields.length > 0 ||
    headerFields.length > 0 ||
    cookieFields.length > 0;
  const hasAnyInputs = hasAnyParams || hasRequestBody;
  const renderRequestAsBodyOnly = hasRequestBody && !hasAnyParams;
  const canFlattenRequest =
    hasAnyInputs &&
    (!hasRequestBody ||
      (isSimpleObjectSchema(requestSchema) &&
        !hasDuplicateFieldNames([
          ...pathFields,
          ...queryFields,
          ...headerFields,
          ...cookieFields,
          ...bodyFields,
        ])));
  const usesNestedRequest = hasAnyInputs && !renderRequestAsBodyOnly && !canFlattenRequest;

  return {
    bodyFields,
    canFlattenRequest,
    hasAnyInputs,
    hasRequestBody,
    renderRequestAsBodyOnly,
    usesNestedRequest,
  };
}

export { buildOperationRequestShape };
