import { withTempDir } from '#test-support/files/temp.mjs';

export const withTempProject = (callback) => withTempDir('openapi-projector-analyzer-', callback);
