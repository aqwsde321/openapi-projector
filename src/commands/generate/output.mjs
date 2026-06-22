import { formatSuccess } from '../../cli/format.mjs';

function printGenerateSummary({
  docsDir,
  endpoints,
  generatedSchemaPath,
  legacyEndpointsDir,
}) {
  console.log(formatSuccess(`Generated ${endpoints.length} review doc(s) into ${docsDir}`));
  console.log(formatSuccess(`Generated schema types into ${generatedSchemaPath}`));
  if (legacyEndpointsDir) {
    console.log(formatSuccess(`Cleared legacy endpoint helper directory: ${legacyEndpointsDir}`));
  }
}

export { printGenerateSummary };
