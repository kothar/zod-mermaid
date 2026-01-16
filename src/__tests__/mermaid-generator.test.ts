import { z } from 'zod';

import { SchemaParseError, DiagramGenerationError } from '../errors';
import { generateMermaidDiagram } from '../mermaid-generator';
import { idRef } from '../id-ref';

describe('Mermaid Generator', () => {
  const mockSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.email(),
    age: z.number().min(0).max(120),
  }).describe('MockSchema');

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
        id: z.string(),
        name: z.string(),
        email: z.email(),
      }).describe('Customer');

      const ProductSchema = z.object({
        id: z.string(),
        name: z.string(),
        price: z.number().positive(),
      }).describe('Product');

      const OrderSchema = z.object({
        id: z.string(),
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
      expect(diagram).toContain('string customerId "ref: Customer"');
      expect(diagram).toContain('string productId "ref: Product"');

      // Should generate relationships with reference style
      expect(diagram).toContain('Order }o--|| Customer : "customerId"');
      expect(diagram).toContain('Order }o--|| Product : "productId"');
    });

    it('should work with optional ID references', () => {
      const UserSchema = z.object({
        id: z.string(),
        name: z.string(),
      }).describe('User');

      const PostSchema = z.object({
        id: z.string(),
        title: z.string(),
        content: z.string(),
        authorId: idRef(UserSchema),
        editorId: idRef(UserSchema).optional(),
      }).describe('Post');

      const diagram = generateMermaidDiagram(PostSchema, { diagramType: 'er' });

      // Should show both required and optional ID references
      expect(diagram).toContain('string authorId "ref: User"');
      expect(diagram).toContain('string editorId "ref: User"');

      // Should generate relationships with reference style and correct cardinality
      expect(diagram).toContain('Post }o--|| User : "authorId"');
      expect(diagram).toContain('Post }o--o{ User : "editorId"');
    });

    it('should work with arrays of ID references', () => {
      const UserSchema = z.object({
        id: z.string(),
        name: z.string(),
      }).describe('User');

      const ProductSchema = z.object({
        id: z.string(),
        name: z.string(),
        price: z.number().positive(),
      }).describe('Product');

      const OrderSchema = z.object({
        id: z.string(),
        customerId: idRef(UserSchema),
        productIds: z.array(idRef(ProductSchema)),
        quantity: z.number().positive(),
      }).describe('Order');

      const diagram = generateMermaidDiagram(OrderSchema, { diagramType: 'er' });

      // Should show ID reference fields with correct types
      expect(diagram).toContain('string customerId "ref: User"');
      expect(diagram).toContain('string[] productIds "ref: Product"');

      // Should generate relationships with reference style
      expect(diagram).toContain('Order }o--|| User : "customerId"');
      expect(diagram).toContain('Order }o--o{ Product : "productIds"');
    });
  });

  describe('multiple schemas', () => {
    it('should generate diagrams from an array of schemas', () => {
      const UserSchema = z.object({
        id: z.string(),
        name: z.string(),
        email: z.email(),
      }).describe('User');

      const ProductSchema = z.object({
        id: z.string(),
        name: z.string(),
        price: z.number().positive(),
        category: z.enum(['electronics', 'clothing', 'books']),
      }).describe('Product');

      const OrderSchema = z.object({
        id: z.string(),
        customerId: idRef(UserSchema),
        productId: idRef(ProductSchema),
        quantity: z.number().positive(),
        orderDate: z.date(),
      }).describe('Order');

      const schemas = [UserSchema, ProductSchema, OrderSchema];
      const diagram = generateMermaidDiagram(schemas, { diagramType: 'er' });

      // Should include all entities from all schemas
      expect(diagram).toContain('User');
      expect(diagram).toContain('Product');
      expect(diagram).toContain('Order');

      // Should show relationships between entities
      expect(diagram).toContain('Order }o--|| User : "customerId"');
      expect(diagram).toContain('Order }o--|| Product : "productId"');
    });

    it('should handle single schema the same as before', () => {
      const UserSchema = z.object({
        id: z.uuid(),
        name: z.string(),
        email: z.email(),
      }).describe('User');

      const singleResult = generateMermaidDiagram(UserSchema, { diagramType: 'er' });
      const arrayResult = generateMermaidDiagram([UserSchema], { diagramType: 'er' });

      // Both should produce the same result
      expect(singleResult).toBe(arrayResult);
      expect(singleResult).toContain('User');
    });

    it('should combine entities from multiple schemas without duplicates', () => {
      const UserSchema = z.object({
        id: z.uuid(),
        name: z.string(),
        email: z.email(),
      }).describe('User');

      const UserProfileSchema = z.object({
        userId: idRef(UserSchema),
        bio: z.string().optional(),
        avatar: z.url().optional(),
      }).describe('UserProfile');

      const schemas = [UserSchema, UserProfileSchema];
      const diagram = generateMermaidDiagram(schemas, { diagramType: 'er' });

      // Should include both entities
      expect(diagram).toContain('User');
      expect(diagram).toContain('UserProfile');

      // Should show the relationship
      expect(diagram).toContain('UserProfile }o--|| User : "userId"');

      // Should include both entities
      expect(diagram).toContain('User {');
      expect(diagram).toContain('UserProfile {');

      // Should show the relationship
      expect(diagram).toContain('UserProfile }o--|| User : "userId"');
    });

    it('should work with all diagram types for multiple schemas', () => {
      const UserSchema = z.object({
        id: z.uuid(),
        name: z.string(),
      }).describe('User');

      const ProductSchema = z.object({
        id: z.uuid(),
        name: z.string(),
        price: z.number().positive(),
      }).describe('Product');

      const schemas = [UserSchema, ProductSchema];

      // Test ER diagram
      const erDiagram = generateMermaidDiagram(schemas, { diagramType: 'er' });
      expect(erDiagram).toContain('erDiagram');
      expect(erDiagram).toContain('User');
      expect(erDiagram).toContain('Product');

      // Test class diagram
      const classDiagram = generateMermaidDiagram(schemas, { diagramType: 'class' });
      expect(classDiagram).toContain('classDiagram');
      expect(classDiagram).toContain('class User');
      expect(classDiagram).toContain('class Product');

      // Test flowchart diagram
      const flowchartDiagram = generateMermaidDiagram(schemas, { diagramType: 'flowchart' });
      expect(flowchartDiagram).toContain('flowchart TD');
      expect(flowchartDiagram).toContain('User["User"]');
      expect(flowchartDiagram).toContain('Product["Product"]');
    });

    it('should handle empty array of schemas', () => {
      const diagram = generateMermaidDiagram([], { diagramType: 'er' });

      // Should generate a valid but empty diagram
      expect(diagram).toBe('erDiagram');
    });
  });

  describe('when generating diagrams with discriminated unions', () => {
    it('should use .describe() for naming union member entities', () => {
      const ResultSchema = z.discriminatedUnion('status', [
        z.object({
          status: z.literal('success'),
          data: z.string(),
        }).describe('SuccessResult'),
        z.object({
          status: z.literal('error'),
          errorMessage: z.string(),
        }).describe('ErrorResult'),
      ]).describe('Result');

      const erDiagram = generateMermaidDiagram(ResultSchema, { diagramType: 'er' });
      
      // Should use the provided descriptions for entity names
      expect(erDiagram).toContain('Result {');
      expect(erDiagram).toContain('SuccessResult {');
      expect(erDiagram).toContain('ErrorResult {');
      expect(erDiagram).toContain('Result ||--|| SuccessResult : "success"');
      expect(erDiagram).toContain('Result ||--|| ErrorResult : "error"');

      const classDiagram = generateMermaidDiagram(ResultSchema, { diagramType: 'class' });
      
      // Should use the provided descriptions in class diagrams too
      expect(classDiagram).toContain('class Result {');
      expect(classDiagram).toContain('class SuccessResult {');
      expect(classDiagram).toContain('class ErrorResult {');
      expect(classDiagram).toContain('Result <|-- SuccessResult : success');
      expect(classDiagram).toContain('Result <|-- ErrorResult : error');
    });

    it('should use .meta({title}) for naming union member entities', () => {
      const ResultSchema = z.discriminatedUnion('type', [
        z.object({
          type: z.literal('ok'),
          value: z.number(),
        }).meta({ title: 'OkResponse' }),
        z.object({
          type: z.literal('err'),
          error: z.string(),
        }).meta({ title: 'ErrResponse' }),
      ]).meta({ title: 'Response' });

      const erDiagram = generateMermaidDiagram(ResultSchema, { diagramType: 'er' });
      
      // Should use the provided meta titles for entity names
      expect(erDiagram).toContain('Response {');
      expect(erDiagram).toContain('OkResponse {');
      expect(erDiagram).toContain('ErrResponse {');
      expect(erDiagram).toContain('Response ||--|| OkResponse : "ok"');
      expect(erDiagram).toContain('Response ||--|| ErrResponse : "err"');
    });

    it('should fall back to generated names when no description or title is provided', () => {
      const ResultSchema = z.discriminatedUnion('status', [
        z.object({
          status: z.literal('success'),
          data: z.string(),
        }),
        z.object({
          status: z.literal('error'),
          errorMessage: z.string(),
        }),
      ]).describe('Result');

      const erDiagram = generateMermaidDiagram(ResultSchema, { diagramType: 'er' });
      
      // Should fall back to generated names like Result_success and Result_error
      expect(erDiagram).toContain('Result {');
      expect(erDiagram).toContain('Result_success {');
      expect(erDiagram).toContain('Result_error {');
    });
  });
});
