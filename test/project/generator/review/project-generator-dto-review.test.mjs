import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFieldEntriesFromParameters,
} from '#src/generator/dto/source-renderer.mjs';
import { renderConcreteNamedSchema } from '#src/generator/dto/source-renderer.mjs';
import { createTypeRenderer } from '#src/generator/dto/source-renderer.mjs';

test('render DTO helpers escape comments, quote unsafe fields, and avoid nullable interfaces', () => {
  const renderer = createTypeRenderer((name) => name);

  assert.deepEqual(
    buildFieldEntriesFromParameters(
      [
        {
          name: 'x-trace-id',
          in: 'header',
          required: false,
          schema: {
            type: 'string',
          },
          description: 'Trace id',
        },
      ],
      'header',
    ),
    [
      {
        name: 'x-trace-id',
        required: false,
        schema: {
          type: 'string',
        },
        description: 'Trace id',
      },
    ],
  );

  assert.equal(
    renderConcreteNamedSchema(
      'MaybeUser',
      {
        type: 'object',
        nullable: true,
        properties: {
          'user-id': {
            type: 'string',
          },
        },
      },
      renderer,
      'line one\nclose */ token',
    ),
    [
      '/**',
      ' * line one',
      ' * close *\\/ token',
      ' */',
      'export type MaybeUser = {',
      '  "user-id"?: string;',
      '} | null;',
    ].join('\n'),
  );
});
