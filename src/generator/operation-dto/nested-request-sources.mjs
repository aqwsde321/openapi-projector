import {
  renderConcreteNamedSchema,
  renderNestedRequestDtoSource,
} from '../dto/source-renderer.mjs';

function buildNestedRequestDtoSources({
  context,
  description,
}) {
  const {
    bodyRequired,
    bodyTypeName,
    cookieFields,
    hasRequestBody,
    headerFields,
    pathFields,
    queryFields,
    requestSchema,
    requestShapeName,
    schemaContext,
  } = context;
  const sources = [];

  if (hasRequestBody && requestSchema) {
    sources.push(
      renderConcreteNamedSchema(
        requestShapeName,
        requestSchema,
        schemaContext.renderer,
        description,
      ),
    );
  }

  sources.push(
    renderNestedRequestDtoSource({
      name: bodyTypeName,
      description,
      pathFields,
      queryFields,
      headerFields,
      cookieFields,
      bodyTypeName: hasRequestBody ? requestShapeName : null,
      hasRequestBody,
      bodyRequired,
      renderer: schemaContext.renderer,
    }),
  );

  return sources;
}

export { buildNestedRequestDtoSources };
