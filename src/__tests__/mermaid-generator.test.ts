import { z } from 'zod';

import { SchemaParseError, DiagramGenerationError } from '../errors';
import { generateMermaidDiagram } from '../mermaid-generator';

describe('generateMermaidDiagram', () => {
  const mockSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
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

  describe('discriminated unions', () => {
    it('should generate diagrams for discriminated unions', () => {
      const discriminatedUnionSchema = z.discriminatedUnion('type', [
        z.object({
          type: z.literal('success'),
          data: z.string(),
        }),
        z.object({
          type: z.literal('error'),
          message: z.string(),
        }),
      ]);

      const result = generateMermaidDiagram(discriminatedUnionSchema, {
        diagramType: 'er',
        entityName: 'Response',
      });

      expect(result).toContain('erDiagram');
      expect(result).toContain('Response');
      expect(result).toContain('Response_success');
      expect(result).toContain('Response_error');
      expect(result).toContain('enum: success, error');
    });

    it('should handle nested objects in discriminated unions', () => {
      const discriminatedUnionSchema = z.discriminatedUnion('status', [
        z.object({
          status: z.literal('success'),
          data: z.object({
            id: z.string(),
            name: z.string(),
          }),
        }),
        z.object({
          status: z.literal('error'),
          message: z.string(),
        }),
      ]);

      const result = generateMermaidDiagram(discriminatedUnionSchema, {
        diagramType: 'er',
        entityName: 'ApiResponse',
      });

      expect(result).toContain('ApiResponse');
      expect(result).toContain('ApiResponse_success');
      expect(result).toContain('ApiResponse_error');
      expect(result).toContain('Data'); // Nested object should be created
    });
  });
});
