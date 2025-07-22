import { z } from 'zod';
import { generateMermaidDiagram } from '../mermaid-generator';

describe('Number validation handling', () => {
  it('should correctly extract min and max validations from number fields', () => {
    const NumberValidationSchema = z
      .object({
        age: z.preprocess((val : unknown) => Math.ceil(Number(val)), z.number().min(18).max(99)),
        score: z.number().positive(),
      })
      .describe('NumberValidations');

    const diagram = generateMermaidDiagram(NumberValidationSchema, { diagramType: 'er' });

    expect(diagram).toContain('number age "min: 18, max: 99"');
    expect(diagram).toContain('number score "positive"');
  });
}); 