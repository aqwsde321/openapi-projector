import path from 'node:path';

import { toProjectRelativePath } from '../core/path-utils.mjs';
import { writeText } from '../io/files.mjs';

async function writeProjectSchemaOutput({
  rootDir,
  schemaContents,
  projectGeneratedSrcDir,
  layoutRules,
}) {
  const schemaFileName = layoutRules.schemaFileName ?? 'schema.ts';
  const schemaOutputPath = path.join(projectGeneratedSrcDir, schemaFileName);

  await writeText(schemaOutputPath, schemaContents);

  return {
    kind: 'schema',
    generated: toProjectRelativePath(rootDir, schemaOutputPath),
  };
}

export {
  writeProjectSchemaOutput,
};
