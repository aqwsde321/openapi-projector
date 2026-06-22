import {
  isParameterLikeObject,
  isPlainObject,
  isScalarValue,
} from './value-types.mjs';

function normalizeDiffValue(value, pathSegments = []) {
  if (Array.isArray(value)) {
    if (value.length === 0 && pathSegments.at(-1) === 'parameters') {
      return {};
    }

    if (value.length > 0 && value.every((item) => isParameterLikeObject(item))) {
      return Object.fromEntries(
        value
          .map((item) => [
            `${item.in}.${item.name}`,
            normalizeDiffValue(item, [...pathSegments, `${item.in}.${item.name}`]),
          ])
          .sort(([left], [right]) => left.localeCompare(right)),
      );
    }

    if (value.every((item) => isScalarValue(item))) {
      return [...value].sort((left, right) =>
        String(left).localeCompare(String(right)),
      );
    }

    return value.map((item, index) => normalizeDiffValue(item, [...pathSegments, String(index)]));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => left.localeCompare(right))
        .map((key) => [key, normalizeDiffValue(value[key], [...pathSegments, key])]),
    );
  }

  return value;
}

export { normalizeDiffValue };
