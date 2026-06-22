function createEndpointPreviewLineKeyState() {
  return {
    section: 'root',
    group: null,
    fieldScope: null,
    fieldsGroup: null,
    blankCount: 0,
  };
}

function resetLineContext(state) {
  state.group = null;
  state.fieldScope = null;
  state.fieldsGroup = null;
}

function resetFieldContext(state) {
  state.fieldScope = null;
  state.fieldsGroup = null;
}

function enterBodyGroup(state) {
  const bodyGroup = `${state.section}.body`;
  state.group = bodyGroup;
  state.fieldScope = bodyGroup;
  state.fieldsGroup = null;
  return bodyGroup;
}

export {
  createEndpointPreviewLineKeyState,
  enterBodyGroup,
  resetFieldContext,
  resetLineContext,
};
