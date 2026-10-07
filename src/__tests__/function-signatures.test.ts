import { z } from 'zod';

import { generateMermaidDiagram } from '../mermaid-generator';
import { validateMermaidSyntax } from './mermaid-validator';

describe('Function signatures', () => {
  it.each(['er', 'class', 'flowchart'] as const)(
    'renders argument and return types in %s',
    async diagramType => {
      const schema = z.object({
        callback: z.function({ input: [z.string(), z.number()], output: z.boolean() }),
        rest: z.function({ input: z.tuple([z.string()]).rest(z.number()), output: z.void() }),
        empty: z.function({ input: [], output: z.promise(z.string()) }),
        unspecified: z.function(),
      });
      const diagram = generateMermaidDiagram(schema, { diagramType });
      expect(diagram).toContain('[string, number], boolean');
      expect(diagram).toContain('[string, ...number[]], void');
      expect(diagram).toContain('[], Promise&lt;string&gt;');
      expect(diagram).toContain('unknown[], unknown');
      await validateMermaidSyntax(diagram);
    },
  );

  it('discovers recursive object signature types without inventing ownership', async () => {
    const value: z.ZodType = z.object({ parent: z.lazy(() => value).optional() }).describe('Value');
    const schema = z.object({ callback: z.function({ input: [value], output: value }).optional() });
    const diagram = generateMermaidDiagram(schema);
    expect(diagram).toContain('[Value], Value');
    expect(diagram.match(/Value {/g)).toHaveLength(1);
    expect(diagram).not.toContain('Entity ||--');
    await validateMermaidSyntax(diagram);
  });
});
