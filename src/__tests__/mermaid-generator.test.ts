import { z } from 'zod';

import { SchemaParseError, DiagramGenerationError } from '../errors';
import { generateMermaidDiagram } from '../mermaid-generator';

describe('generateMermaidDiagram', () => {
  const mockSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    age: z.number().min(0).max(120),
  });

  describe('when generating ER diagrams', () => {
    it('should generate a valid ER diagram', () => {
      const result = generateMermaidDiagram(mockSchema, { diagramType: 'er' });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('erDiagram');
    });

    it('should include validation rules when enabled', () => {
      const result = generateMermaidDiagram(mockSchema, {
        diagramType: 'er',
        includeValidation: true,
      });

      expect(result).toContain('erDiagram');
    });

    it('should exclude validation rules when disabled', () => {
      const result = generateMermaidDiagram(mockSchema, {
        diagramType: 'er',
        includeValidation: false,
      });

      expect(result).toContain('erDiagram');
    });
  });

  describe('when generating class diagrams', () => {
    it('should generate a valid class diagram', () => {
      const result = generateMermaidDiagram(mockSchema, { diagramType: 'class' });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('classDiagram');
    });
  });

  describe('when generating flowchart diagrams', () => {
    it('should generate a valid flowchart', () => {
      const result = generateMermaidDiagram(mockSchema, { diagramType: 'flowchart' });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('flowchart TD');
    });
  });

  describe('error handling', () => {
    it('should throw DiagramGenerationError for unsupported diagram types', () => {
      expect(() => {
        generateMermaidDiagram(mockSchema, { diagramType: 'invalid' as any });
      }).toThrow(DiagramGenerationError);
    });

    it('should throw SchemaParseError for invalid schemas', () => {
      const invalidSchema = null as any;

      expect(() => {
        generateMermaidDiagram(invalidSchema);
      }).toThrow(SchemaParseError);
    });
  });

  describe('default options', () => {
    it('should use default options when none provided', () => {
      const result = generateMermaidDiagram(mockSchema);

      expect(result).toBeDefined();
      expect(result).toContain('erDiagram');
    });

    it('should merge provided options with defaults', () => {
      const result = generateMermaidDiagram(mockSchema, {
        diagramType: 'class',
        includeValidation: false,
      });

      expect(result).toContain('classDiagram');
    });
  });
});
