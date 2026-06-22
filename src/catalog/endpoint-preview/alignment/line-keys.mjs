import { getEndpointPreviewFieldLineKey } from './field-line-key.mjs';
import {
  createEndpointPreviewLineKeyState,
} from './line-key-state.mjs';
import { getEndpointPreviewStructuralLineKey } from './structural-line-key.mjs';

function keyEndpointPreviewLines(lines) {
  const state = createEndpointPreviewLineKeyState();
  const keyCounts = new Map();

  return lines.map((line, index) => {
    const baseKey = getEndpointPreviewLineKey(line, state, index);
    const count = keyCounts.get(baseKey) ?? 0;
    keyCounts.set(baseKey, count + 1);

    return {
      key: count === 0 ? baseKey : `${baseKey}#${count + 1}`,
      text: line,
    };
  });
}

function getEndpointPreviewLineKey(line, state, index) {
  const text = String(line ?? '');
  const trimmed = text.trim();
  const structuralLineKey = getEndpointPreviewStructuralLineKey(trimmed, state);

  if (structuralLineKey) {
    return structuralLineKey;
  }

  const fieldLineKey = getEndpointPreviewFieldLineKey(text, trimmed, state);
  if (fieldLineKey) {
    return fieldLineKey;
  }

  return `${state.section}.line.${index}`;
}

export {
  keyEndpointPreviewLines,
};
