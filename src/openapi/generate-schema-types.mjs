import openapiTS, { astToString } from 'openapi-typescript';

async function generateSchemaTypes(sourceUrl) {
  const ast = await openapiTS(sourceUrl, {
    alphabetize: false,
    silent: true,
  });

  return astToString(ast);
}

export { generateSchemaTypes };
