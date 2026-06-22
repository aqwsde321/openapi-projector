import { renderInlineRequestDtoSource } from '../dto/source-renderer.mjs';

function buildFlatRequestDtoSource({
  context,
  description,
}) {
  const {
    bodyFields,
    bodyTypeName,
    cookieFields,
    headerFields,
    pathFields,
    queryFields,
    schemaContext,
  } = context;

  return renderInlineRequestDtoSource({
    name: bodyTypeName,
    description,
    fields: [...pathFields, ...queryFields, ...headerFields, ...cookieFields, ...bodyFields],
    renderer: schemaContext.renderer,
  });
}

export { buildFlatRequestDtoSource };
