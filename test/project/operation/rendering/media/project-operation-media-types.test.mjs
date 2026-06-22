import test from 'node:test';

import { renderOperationSection } from '#src/generator/render-operation-section.mjs';
import {
  assertDoesNotMatchAny,
  assertMatchesAll,
} from '#test-support/assertions/text.mjs';
import { createTypedReportMediaRenderOperation } from '#test-support/project/media-fixture.mjs';

test('renderOperationSection uses preferred supported media types when alternatives exist', () => {
  const rendered = renderOperationSection({
    spec: {},
    operation: createTypedReportMediaRenderOperation(),
    functionName: 'createReport',
    dtoImportPath: './create-report.dto',
    runtimeFetchImportPath: '@/shared/api',
    runtimeFetchSymbol: 'fetchAPI',
    runtimeCallStyle: 'url-config',
  });

  assertMatchesAll(rendered.dtoSource, [
    /export interface CreateReportRequestDto \{/,
    /name: string;/,
    /export interface CreateReportResponseDto \{/,
    /id: string;/,
  ]);
  assertDoesNotMatchAny(rendered.dtoSource, [
    /export type CreateReportRequestDto = string;/,
    /export type CreateReportResponseDto = string;/,
  ]);
});
