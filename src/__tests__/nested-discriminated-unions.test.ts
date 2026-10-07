import { z } from 'zod';

import { generateMermaidDiagram } from '../mermaid-generator';
import { validateMermaidSyntax } from './mermaid-validator';

const ERROR = z
  .discriminatedUnion('code', [
    z.object({ status: z.literal('failed'), code: z.literal(400), message: z.string() }),
    z.object({ status: z.literal('failed'), code: z.literal(500), retry: z.boolean() }),
  ])
  .describe('Failure');
const RESULT = z
  .discriminatedUnion('status', [z.object({ status: z.literal('ok'), value: z.string() }), ERROR])
  .describe('Result');

describe('Nested discriminated unions', () => {
  it.each(['er', 'class', 'flowchart'] as const)(
    'retains nested variants in %s',
    async diagramType => {
      const diagram = generateMermaidDiagram([RESULT, ERROR], { diagramType });
      for (const name of ['Result_ok', 'Failure_400', 'Failure_500', 'message', 'retry']) {
        expect(diagram).toContain(name);
      }
      if (diagramType === 'er') {
        expect(diagram).toContain('enum: ok, failed');
        expect(diagram).toContain('enum: 400, 500');
        expect(diagram).toContain('Result ||--|| Failure : "failed"');
        expect(diagram.match(/Failure {/g)).toHaveLength(1);
      }
      await validateMermaidSyntax(diagram);
    },
  );

  it('retains multi-value discriminators across three levels', async () => {
    const nested = z
      .discriminatedUnion('status', [
        z.object({ status: z.literal(['pending', 'queued']), queued: z.boolean() }),
        RESULT,
      ])
      .describe('Task');
    const diagram = generateMermaidDiagram(nested);
    expect(diagram).toContain('enum: pending, queued, ok, failed');
    expect(diagram).toContain('Failure_500');
    await validateMermaidSyntax(diagram);
  });
});
