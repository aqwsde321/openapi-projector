import {
  addIssue,
  validateRequiredValue,
} from './issues.mjs';

const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function validateOptionalEnum(issues, path, value, supportedValues) {
  if (value == null) {
    return;
  }

  if (!supportedValues.has(value)) {
    addIssue(
      issues,
      path,
      `unsupported value ${JSON.stringify(value)}; supported values: ${Array.from(supportedValues).join(', ')}`,
    );
  }
}

function validateRequiredEnum(issues, path, value, supportedValues) {
  validateRequiredValue(issues, path, value, () => validateOptionalEnum(issues, path, value, supportedValues));
}

function validateOptionalString(issues, path, value) {
  if (value == null) {
    return;
  }

  if (typeof value !== 'string' || !value.trim()) {
    addIssue(issues, path, 'must be a non-empty string');
  }
}

function validateRequiredString(issues, path, value) {
  validateRequiredValue(issues, path, value, () => validateOptionalString(issues, path, value));
}

function validateOptionalIdentifier(issues, path, value) {
  if (value == null) {
    return;
  }

  if (typeof value !== 'string' || !IDENTIFIER_PATTERN.test(value)) {
    addIssue(issues, path, 'must be a valid JavaScript identifier');
  }
}

function validateRequiredIdentifier(issues, path, value) {
  validateRequiredValue(issues, path, value, () => validateOptionalIdentifier(issues, path, value));
}

function validateOptionalBoolean(issues, path, value) {
  if (value == null) {
    return;
  }

  if (typeof value !== 'boolean') {
    addIssue(issues, path, 'must be a boolean');
  }
}

export {
  validateOptionalBoolean,
  validateOptionalEnum,
  validateOptionalIdentifier,
  validateOptionalString,
  validateRequiredEnum,
  validateRequiredIdentifier,
  validateRequiredString,
};
