import {
  getEndpointPreviewGroupKey,
} from './line-parser.mjs';
import {
  enterBodyGroup,
  resetFieldContext,
  resetLineContext,
} from './line-key-state.mjs';

function getEndpointPreviewStructuralLineKey(trimmed, state) {
  if (!trimmed) {
    resetLineContext(state);
    state.blankCount += 1;
    return `blank.${state.blankCount}`;
  }

  if (trimmed === '요청' || trimmed === '응답') {
    state.section = trimmed === '요청' ? 'request' : 'response';
    resetLineContext(state);
    return state.section;
  }

  const groupKey = getEndpointPreviewGroupKey(trimmed);
  if (groupKey) {
    const scopedGroupKey =
      groupKey === 'fields' && state.fieldScope
        ? `${state.fieldScope}.fields`
        : `${state.section}.${groupKey}`;
    state.group = scopedGroupKey;
    if (groupKey === 'fields') {
      state.fieldsGroup = scopedGroupKey;
    } else {
      resetFieldContext(state);
    }
    return scopedGroupKey;
  }

  if (trimmed.startsWith('- Body:')) {
    return enterBodyGroup(state);
  }
  if (trimmed.startsWith('- Content-Type:')) {
    state.group = `${state.section}.contentType`;
    state.fieldsGroup = null;
    return `${state.section}.contentType`;
  }
  if (/^- (default|[1-5][0-9]{2})(?:\s|:)/u.test(trimmed)) {
    enterBodyGroup(state);
    return `${state.section}.primaryResponse`;
  }

  return null;
}

export { getEndpointPreviewStructuralLineKey };
