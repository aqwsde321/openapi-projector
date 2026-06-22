import { isPlainObject } from '../../core/object-utils.mjs';
import {
  addIssue,
  validateOptionalEnum,
  validateOptionalIdentifier,
  validateOptionalString,
  validateRequiredEnum,
  validateRequiredIdentifier,
  validateRequiredString,
} from './common.mjs';

const SUPPORTED_ADAPTER_STYLES = new Set(['url-config', 'request-object']);
const SUPPORTED_FETCH_API_IMPORT_KINDS = new Set(['named', 'default']);
const SUPPORTED_TAG_FILE_CASES = new Set(['kebab', 'title']);
const SUPPORTED_WRAPPER_GROUPINGS = new Set(['tag', 'flat']);

function validateRuntimeHelperRules(issues, api, rulesReviewed) {
  const validateString = rulesReviewed ? validateRequiredString : validateOptionalString;
  const validateIdentifier = rulesReviewed
    ? validateRequiredIdentifier
    : validateOptionalIdentifier;
  const validateEnum = rulesReviewed ? validateRequiredEnum : validateOptionalEnum;

  validateString(issues, 'api.fetchApiImportPath', api.fetchApiImportPath);
  validateIdentifier(issues, 'api.fetchApiSymbol', api.fetchApiSymbol);
  validateEnum(
    issues,
    'api.fetchApiImportKind',
    api.fetchApiImportKind,
    SUPPORTED_FETCH_API_IMPORT_KINDS,
  );
  validateEnum(
    issues,
    'api.adapterStyle',
    api.adapterStyle,
    SUPPORTED_ADAPTER_STYLES,
  );
}

function validateApiRules(issues, api, rulesReviewed) {
  if (!isPlainObject(api)) {
    addIssue(issues, 'api', 'must be an object');
    return;
  }

  validateRuntimeHelperRules(issues, api, rulesReviewed);

  validateOptionalEnum(
    issues,
    'api.wrapperGrouping',
    api.wrapperGrouping,
    SUPPORTED_WRAPPER_GROUPINGS,
  );
  validateOptionalEnum(
    issues,
    'api.tagFileCase',
    api.tagFileCase,
    SUPPORTED_TAG_FILE_CASES,
  );
}

export { validateApiRules };
