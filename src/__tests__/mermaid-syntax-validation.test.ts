import { z } from 'zod';
import { generateMermaidDiagram } from '../mermaid-generator';
import { idRef } from '../id-ref';
import { validateMermaidSyntax, extractMermaidDiagrams } from '../test/mermaid-validator';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

describe('Mermaid Syntax Validation', () => {
  it('should generate valid ER diagrams for User schema', async () => {
    const schema = z.object({
      id: z.uuid(),
      name: z.string().min(1).max(100),
      email: z.email(),
      profile: z.object({
        bio: z.string().optional(),
        avatar: z.url().optional(),
      }),
    }).describe('User');

    const diagram = generateMermaidDiagram(schema, { diagramType: 'er' });
    await validateMermaidSyntax(diagram);
  });

  it('should generate valid class diagrams for Product schema', async () => {
    const schema = z.object({
      id: z.string(),
      name: z.string(),
      price: z.number().positive(),
      category: z.enum(['electronics', 'clothing', 'books']),
    }).describe('Product');

    const diagram = generateMermaidDiagram(schema, { diagramType: 'class' });
    await validateMermaidSyntax(diagram);
  });

  it('should generate valid flowchart diagrams for Order schema', async () => {
    const schema = z.object({
      id: z.string(),
      status: z.enum(['pending', 'shipped', 'delivered']),
      quantity: z.number().positive(),
    }).describe('Order');

    const diagram = generateMermaidDiagram(schema, { diagramType: 'flowchart' });
    await validateMermaidSyntax(diagram);
  });

  it('should generate valid diagrams with ID references', async () => {
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
      productIds: z.array(idRef(ProductSchema)),
      quantity: z.number().positive(),
    }).describe('Order');

    const erDiagram = generateMermaidDiagram(OrderSchema, { diagramType: 'er' });
    const classDiagram = generateMermaidDiagram(OrderSchema, { diagramType: 'class' });
    const flowchartDiagram = generateMermaidDiagram(OrderSchema, { diagramType: 'flowchart' });

    await validateMermaidSyntax(erDiagram);
    await validateMermaidSyntax(classDiagram);
    await validateMermaidSyntax(flowchartDiagram);
  });

  it('should generate valid diagrams with discriminated unions', async () => {
    const schema = z.discriminatedUnion('status', [
      z.object({
        status: z.literal('success'),
        data: z.object({
          id: z.string(),
          name: z.string(),
        }),
      }).describe('Success'),
      z.object({
        status: z.literal('error'),
        message: z.string(),
      }).describe('Error'),
    ]).describe('ApiResponse');

    const erDiagram = generateMermaidDiagram(schema, { diagramType: 'er' });
    const classDiagram = generateMermaidDiagram(schema, { diagramType: 'class' });
    const flowchartDiagram = generateMermaidDiagram(schema, { diagramType: 'flowchart' });

    await validateMermaidSyntax(erDiagram);
    await validateMermaidSyntax(classDiagram);
    await validateMermaidSyntax(flowchartDiagram);
  });

  it('should generate valid diagrams for self-referential schemas', async () => {
    const DirectorySchema = z.lazy(() =>
      z.object({
        name: z.string(),
        path: z.string(),
        isDirectory: z.boolean(),
        size: z.number().optional(),
        children: z.array(DirectorySchema as any).optional(),
      }).describe('Directory'),
    ) as any;

    const erDiagram = generateMermaidDiagram(DirectorySchema, { diagramType: 'er' });
    const classDiagram = generateMermaidDiagram(DirectorySchema, { diagramType: 'class' });
    const flowchartDiagram = generateMermaidDiagram(DirectorySchema, { diagramType: 'flowchart' });

    await validateMermaidSyntax(erDiagram);
    await validateMermaidSyntax(classDiagram);
    await validateMermaidSyntax(flowchartDiagram);
  });

  it('should include class header for lazy self-referential schemas', async () => {
    const DirectorySchema = z.lazy(() =>
      z.object({
        name: z.string(),
        children: z.array(z.lazy(() => DirectorySchema)).optional(),
      }).describe('Directory'),
    ) as any;

    const classDiagram = generateMermaidDiagram(DirectorySchema, { diagramType: 'class' });

    expect(classDiagram.trim().startsWith('classDiagram')).toBe(true);
    expect(classDiagram).toMatch(/class\s+Directory\s*\{/);

    await validateMermaidSyntax(classDiagram);
  });

  it('should validate all diagrams in the examples markdown', async () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const examplesPath = join(__dirname, '../../examples/mermaid-examples.md');
    const content = readFileSync(examplesPath, 'utf-8');
    const diagrams = extractMermaidDiagrams(content);

    expect(diagrams.length).toBeGreaterThan(0);

    for (const diagram of diagrams) {
      await validateMermaidSyntax(diagram);
    }
  });
});
