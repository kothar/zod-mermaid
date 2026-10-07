import { z } from 'zod';

import { generateMermaidDiagram } from '../mermaid-generator';
import { escapeLabel } from '../syntax';
import { validateMermaidSyntax } from './mermaid-validator';

describe('Template-literal patterns', () => {
  it.each([
    z.templateLiteral(['item-', z.number()]),
    z.templateLiteral([z.enum(['small', 'large']), '-', z.boolean()]),
    z.templateLiteral(['"<&{}', z.string(), '\\end']),
    z.templateLiteral([]),
  ])('retains the Zod pattern through wrappers', async template => {
    const schema = z.object({ value: template.optional().readonly() });
    const diagram = generateMermaidDiagram(schema);
    expect(diagram).toContain(`pattern: ${escapeLabel(String(template._zod.pattern))}`);
    expect(diagram).toContain('string value');
    await validateMermaidSyntax(diagram);
    expect(generateMermaidDiagram(schema, { includeValidation: false })).not.toContain('pattern:');
  });
});
