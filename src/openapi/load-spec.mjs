import { readJson } from '../io/files.mjs';
import { validateSupportedOpenApiSpec } from './validate-spec.mjs';

async function loadSupportedOpenApiSpec(sourcePath) {
  let spec;

  try {
    spec = await readJson(sourcePath);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Only OpenAPI 3.0/3.1 JSON is supported in MVP v2.\nCould not parse JSON: ${sourcePath}`,
      );
    }

    throw error;
  }

  validateSupportedOpenApiSpec(spec, sourcePath);

  return spec;
}

export {
  loadSupportedOpenApiSpec,
};
