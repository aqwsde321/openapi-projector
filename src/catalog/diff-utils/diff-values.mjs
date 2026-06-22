import { formatPathSegments } from '../format/path.mjs';
import { stableStringify } from './stable-stringify.mjs';
import { isPlainObject } from './value-types.mjs';

function collectLeafChanges(kind, previousValue, nextValue, pathSegments) {
  const targetValue = kind === 'added' ? nextValue : previousValue;

  if (isPlainObject(targetValue)) {
    const entries = Object.entries(targetValue);
    if (entries.length === 0) {
      return [createLeafChange(kind, previousValue, nextValue, pathSegments)];
    }

    return entries.flatMap(([key, child]) =>
      collectLeafChanges(
        kind,
        kind === 'added' ? null : child,
        kind === 'added' ? child : null,
        [...pathSegments, key],
      ),
    );
  }

  return [createLeafChange(kind, previousValue, nextValue, pathSegments)];
}

function createLeafChange(kind, previousValue, nextValue, pathSegments) {
  return {
    kind,
    path: formatPathSegments(pathSegments),
    previous: previousValue,
    next: nextValue,
  };
}

function diffValues(previousValue, nextValue, pathSegments) {
  if (stableStringify(previousValue) === stableStringify(nextValue)) {
    return [];
  }

  if (isPlainObject(previousValue) && isPlainObject(nextValue)) {
    const keys = new Set([...Object.keys(previousValue), ...Object.keys(nextValue)]);
    return [...keys]
      .sort((left, right) => left.localeCompare(right))
      .flatMap((key) => {
        const nextPath = [...pathSegments, key];
        const hasPrevious = Object.hasOwn(previousValue, key);
        const hasNext = Object.hasOwn(nextValue, key);

        if (!hasPrevious) {
          return collectLeafChanges('added', null, nextValue[key], nextPath);
        }

        if (!hasNext) {
          return collectLeafChanges('removed', previousValue[key], null, nextPath);
        }

        return diffValues(previousValue[key], nextValue[key], nextPath);
      });
  }

  return [
    {
      kind: 'changed',
      path: formatPathSegments(pathSegments),
      previous: previousValue,
      next: nextValue,
    },
  ];
}

export { diffValues };
