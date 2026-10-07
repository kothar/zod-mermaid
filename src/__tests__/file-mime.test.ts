import { z } from 'zod';

import { generateMermaidDiagram } from '../mermaid-generator';
import { validateMermaidSyntax } from './mermaid-validator';

describe('File MIME constraints', () => {
  it('includes single and multiple MIME types alongside byte bounds through wrappers', async () => {
    const schema = z.object({
      image: z.file().mime(['image/png', 'image/jpeg']).min(0).max(1024).optional().readonly(),
      document: z.file().mime('application/pdf'),
      unrestricted: z.file(),
    });
    const diagram = generateMermaidDiagram(schema);
    expect(diagram).toContain('mime: image/png, image/jpeg, min size: 0, max size: 1024');
    expect(diagram).toContain('file document "mime: application/pdf"');
    expect(diagram).toContain('file unrestricted\n');
    await validateMermaidSyntax(diagram);
    expect(generateMermaidDiagram(schema, { includeValidation: false })).not.toContain('mime:');
  });

  it('escapes MIME values before rendering annotations', async () => {
    const diagram = generateMermaidDiagram(z.file().mime('text/x-"quoted"'));
    expect(diagram).toContain('mime: text/x-&quot;quoted&quot;');
    await validateMermaidSyntax(diagram);
  });
});
