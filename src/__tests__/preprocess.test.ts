import { z } from 'zod';
import { generateMermaidDiagram } from '../mermaid-generator';

describe('Preprocess type handling', () => {
  it('should correctly extract the final type from a z.preprocess field', () => {
    const PreprocessedSchema = z
      .object({
        cleaned: z.preprocess((val) => (typeof val === 'string' ? val.trim() : val), z.string()),
        numberified: z.preprocess((val) => Number(val), z.number()),
      })
      .describe('Preprocessed');

    const diagram = generateMermaidDiagram(PreprocessedSchema, { diagramType: 'er' });

    expect(diagram).toContain('string cleaned');
    expect(diagram).toContain('number numberified');
  });
}); 