import { z } from 'zod';

import { SchemaParseError, DiagramGenerationError } from '../errors';
import { generateMermaidDiagram, idRef } from '../mermaid-generator';

describe('Mermaid Generator', () => {
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

  describe('ID References', () => {
    it('should generate relationships for ID references', () => {
      const CustomerSchema = z.object({
        id: z.uuid(),
        name: z.string(),
        email: z.email(),
      }).describe('Customer');

      const ProductSchema = z.object({
        id: z.uuid(),
        name: z.string(),
        price: z.number().positive(),
      }).describe('Product');

      const OrderSchema = z.object({
        id: z.uuid(),
        customerId: idRef(CustomerSchema),
        productId: idRef(ProductSchema),
        quantity: z.number().positive(),
        orderDate: z.date(),
      }).describe('Order');

      const diagram = generateMermaidDiagram(OrderSchema, { diagramType: 'er' });

      // Should include all entities
      expect(diagram).toContain('Customer');
      expect(diagram).toContain('Product');
      expect(diagram).toContain('Order');

      // Should show ID reference fields with correct types
      expect(diagram).toContain('string customerId "ref: Customer, uuid"');
      expect(diagram).toContain('string productId "ref: Product, uuid"');

      // Should generate relationships with reference style
      expect(diagram).toContain('Order }o--|| Customer : "customerId"');
      expect(diagram).toContain('Order }o--|| Product : "productId"');
    });

    it('should work with optional ID references', () => {
      const UserSchema = z.object({
        id: z.uuid(),
        name: z.string(),
      }).describe('User');

      const PostSchema = z.object({
        id: z.uuid(),
        title: z.string(),
        content: z.string(),
        authorId: idRef(UserSchema),
        editorId: idRef(UserSchema).optional(),
      }).describe('Post');

      const diagram = generateMermaidDiagram(PostSchema, { diagramType: 'er' });

      // Should show both required and optional ID references
      expect(diagram).toContain('string authorId "ref: User, uuid"');
      expect(diagram).toContain('string editorId "ref: User, uuid"');

      // Should generate relationships with reference style and correct cardinality
      expect(diagram).toContain('Post }o--|| User : "authorId"');
      expect(diagram).toContain('Post }o--o{ User : "editorId"');
    });
  });
});
