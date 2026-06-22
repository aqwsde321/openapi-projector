import { stripMarkdownFormatting } from '../../format/inline.mjs';
import { stripSchemaTargetMetadata } from '../path-utils/index.mjs';
import {
  getSchemaFieldCategory,
  getSchemaUsageLabel,
  isResponseBodyOnlySchema,
} from './labels.mjs';

function matchKnownSchemaTarget(target, comparisonContext = {}) {
  const normalizedTarget = stripMarkdownFormatting(target)
    .replace(/^schema\./, '')
    .replace(/^referencedSchemas\./, '');
  const schemaTarget = stripSchemaTargetMetadata(normalizedTarget);
  const schemaNames = getKnownSchemaNames(comparisonContext)
    .sort((left, right) => right.length - left.length);

  for (const schemaName of schemaNames) {
    if (schemaTarget === schemaName) {
      return {
        schemaName,
        propertyName: null,
        fieldPath: '',
      };
    }

    if (schemaTarget.startsWith(`${schemaName}.`)) {
      const [propertyName, ...fieldParts] = schemaTarget
        .slice(schemaName.length + 1)
        .split('.');
      return {
        schemaName,
        propertyName: propertyName || null,
        fieldPath: fieldParts.join('.'),
      };
    }
  }

  return null;
}

function getKnownSchemaNames(comparisonContext = {}) {
  return [
    ...Object.keys(comparisonContext?.previousSnapshot?.referencedSchemas ?? {}),
    ...Object.keys(comparisonContext?.nextSnapshot?.referencedSchemas ?? {}),
  ];
}

export {
  getSchemaFieldCategory,
  getSchemaUsageLabel,
  isResponseBodyOnlySchema,
  matchKnownSchemaTarget,
};
