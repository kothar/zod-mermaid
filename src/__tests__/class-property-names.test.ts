import { z } from 'zod';

import { generateMermaidDiagram } from '../mermaid-generator';
import { escapeLabel } from '../syntax';
import { validateMermaidSyntax } from './mermaid-validator';

describe('Original class property names', () => {
  it('maps normalized and colliding identifiers to escaped original names', async () => {
    const names = [
      'first name',
      'first-name',
      'first_name',
      '用户',
      '',
      '123',
      'x"}\nInjected {',
      'a<br/>b',
    ];
    const schema = z.object(Object.fromEntries(names.map(name => [name, z.string()])));
    const diagram = generateMermaidDiagram(schema, {
      diagramType: 'class',
      includeValidation: false,
    });
    expect(diagram).toContain('note for Entity "<b>Raw identifiers</b><br/>');
    expect(diagram).toContain('first_name_2: &quot;first-name&quot;');
    expect(diagram).toContain('first_name_3: &quot;first_name&quot;');
    for (const name of names) {
      expect(diagram).toContain(escapeLabel(JSON.stringify(name)));
    }
    await validateMermaidSyntax(diagram);
  });

  it('does not add notes for unchanged property names', () => {
    const diagram = generateMermaidDiagram(z.object({ name: z.string() }), {
      diagramType: 'class',
    });
    expect(diagram).not.toContain('note for');
    expect(diagram).toContain('+name: string');
  });
});
