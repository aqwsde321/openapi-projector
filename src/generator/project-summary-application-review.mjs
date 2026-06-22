import { renderEndpointApplicationReview } from './project-summary-endpoint-review.mjs';
import { renderRuntimeImport } from './project-summary-runtime-import.mjs';

function renderApplicationReviewSection(applicationReview) {
  if (!applicationReview?.endpoints?.length) {
    return [];
  }

  const lines = [
    '',
    '## Application Review',
    '',
    'Use this section before copying generated candidates into the app.',
    'Do not copy generated API files as-is. Re-check the project rules analysis and the real feature code before applying candidates.',
    'Adapt URL constants, existing DTO reuse, export style, error handling, response unwrapping, and query/cache conventions to match the app.',
    '',
    '### Runtime Wrapper',
    '',
    `- Import used by generated APIs: \`${renderRuntimeImport(applicationReview.runtimeWrapper)}\``,
    `- Call shape: \`${applicationReview.runtimeWrapper.callShape}\``,
  ];

  for (const assumption of applicationReview.runtimeWrapper.assumptions) {
    lines.push(`- Check: ${assumption}`);
  }

  lines.push('');
  lines.push('### Endpoint Contracts');
  lines.push('');

  for (const endpoint of applicationReview.endpoints) {
    lines.push(...renderEndpointApplicationReview(endpoint));
  }

  return lines;
}

export {
  renderApplicationReviewSection,
};
