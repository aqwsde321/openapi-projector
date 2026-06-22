import {
  renderConcreteNamedSchema,
} from '../dto/source-renderer.mjs';
import {
  buildFlatRequestDtoSource,
  buildNestedRequestDtoSources,
} from './request-sources.mjs';

function buildRequestDtoSources({
  operation,
  context,
}) {
  const description = operation.requestBody?.description ?? context.docText;

  if (context.renderRequestAsBodyOnly && context.requestSchema) {
    return [
      renderConcreteNamedSchema(
        context.bodyTypeName,
        context.requestSchema,
        context.schemaContext.renderer,
        description,
      ),
    ];
  }

  if (context.canFlattenRequest) {
    return [
      buildFlatRequestDtoSource({
        context,
        description,
      }),
    ];
  }

  return context.usesNestedRequest
    ? buildNestedRequestDtoSources({
        context,
        description,
      })
    : [];
}

export { buildRequestDtoSources };
