import {
  renderConcreteNamedSchema,
} from '../dto/source-renderer.mjs';
import { buildRequestDtoSources } from './request-renderer.mjs';

function renderOperationDtoSource({
  spec,
  operation,
  context,
}) {
  return buildOperationDtoSources({
    spec,
    operation,
    context,
  }).join('\n\n').trimEnd();
}

function buildOperationDtoSources({
  spec,
  operation,
  context,
}) {
  return [
    ...buildLocalSchemaDtoSources({
      spec,
      schemaContext: context.schemaContext,
    }),
    ...buildRequestDtoSources({
      operation,
      context,
    }),
    buildResponseDtoSource({
      operation,
      context,
    }),
  ];
}

function buildLocalSchemaDtoSources({
  spec,
  schemaContext,
}) {
  return schemaContext.localSchemaNames.map((localSchemaName) =>
    renderConcreteNamedSchema(
      schemaContext.schemaNameMap.get(localSchemaName),
      spec.components.schemas[localSchemaName],
      schemaContext.renderer,
      spec.components.schemas[localSchemaName]?.description,
    ),
  );
}

function buildResponseDtoSource({
  operation,
  context,
}) {
  const {
    docText,
    responseSchema,
    responseTypeName,
    schemaContext,
  } = context;

  return renderConcreteNamedSchema(
    responseTypeName,
    responseSchema ?? {},
    schemaContext.renderer,
    operation.successResponse?.description ?? docText,
  );
}

export {
  renderOperationDtoSource,
};
