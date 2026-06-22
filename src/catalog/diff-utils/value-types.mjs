import { isPlainObject } from '../../core/object-utils.mjs';

function isParameterLikeObject(value) {
  return isPlainObject(value) && typeof value.name === 'string' && typeof value.in === 'string';
}

function isScalarValue(value) {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

export {
  isParameterLikeObject,
  isPlainObject,
  isScalarValue,
};
