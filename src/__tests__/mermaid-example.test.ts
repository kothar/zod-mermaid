import { writeFileSync } from 'fs';
import { join } from 'path';

import { z } from 'zod';

import { generateMermaidDiagram } from '../mermaid-generator';

describe('Mermaid Example Generation', () => {
  it('should generate example diagrams and save to markdown', () => {
    // Define example schemas
    const UserSchema = z.object({
      id: z.uuid(),
      name: z.string().min(1).max(100),
      email: z.email(),
      age: z.number().min(0).max(120),
      isActive: z.boolean(),
      createdAt: z.date(),
      profile: z.object({
        bio: z.string().optional(),
        avatar: z.url().optional(),
        preferences: z.object({
          theme: z.enum(['light', 'dark']).default('light'),
          notifications: z.boolean().default(true),
        }),
      }),
    });

    const ProductSchema = z.object({
      id: z.string(),
      name: z.string(),
      price: z.number().positive(),
      category: z.enum(['electronics', 'clothing', 'books']),
      inStock: z.boolean(),
      tags: z.array(z.string()),
      metadata: z.record(z.string(), z.unknown()),
    });

    // Directory listing with self-referential types
    const DirectorySchema: z.ZodType<any> = z.object({
      name: z.string(),
      path: z.string(),
      isDirectory: z.boolean(),
      size: z.number().optional(),
      modifiedAt: z.date(),
      children: z.array(z.lazy(() => DirectorySchema)).optional(),
    });

    // Generate different types of diagrams
    const erDiagram = generateMermaidDiagram(UserSchema, { diagramType: 'er', entityName: 'User' });
    const classDiagram = generateMermaidDiagram(UserSchema, {
      diagramType: 'class',
      entityName: 'User',
    });
    const flowchartDiagram = generateMermaidDiagram(UserSchema, {
      diagramType: 'flowchart',
      entityName: 'User',
    });

    const productERDiagram = generateMermaidDiagram(ProductSchema, {
      diagramType: 'er',
      entityName: 'Product',
    });

    const directoryERDiagram = generateMermaidDiagram(DirectorySchema, {
      diagramType: 'er',
      entityName: 'Directory',
    });
    const directoryClassDiagram = generateMermaidDiagram(DirectorySchema, {
      diagramType: 'class',
      entityName: 'Directory',
    });
    const directoryFlowchartDiagram = generateMermaidDiagram(DirectorySchema, {
      diagramType: 'flowchart',
      entityName: 'Directory',
    });

    // Create markdown content
    const markdownContent = `# Zod Mermaid Examples

This document contains example Mermaid diagrams generated from Zod schemas using the zod-mermaid library.

## User Schema Examples

### Entity-Relationship Diagram
\`\`\`mermaid
${erDiagram}
\`\`\`

### Class Diagram
\`\`\`mermaid
${classDiagram}
\`\`\`

### Flowchart Diagram
\`\`\`mermaid
${flowchartDiagram}
\`\`\`

## Product Schema Example

### Entity-Relationship Diagram
\`\`\`mermaid
${productERDiagram}
\`\`\`

## Directory Schema Example (Self-Referential)

### Entity-Relationship Diagram
\`\`\`mermaid
${directoryERDiagram}
\`\`\`

### Class Diagram
\`\`\`mermaid
${directoryClassDiagram}
\`\`\`

### Flowchart Diagram
\`\`\`mermaid
${directoryFlowchartDiagram}
\`\`\`

## Schema Definitions

### User Schema
\`\`\`typescript
const UserSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(100),
  email: z.email(),
  age: z.number().min(0).max(120),
  isActive: z.boolean(),
  createdAt: z.date(),
  profile: z.object({
    bio: z.string().optional(),
    avatar: z.url().optional(),
    preferences: z.object({
      theme: z.enum(['light', 'dark']).default('light'),
      notifications: z.boolean().default(true),
    }),
  }),
});
\`\`\`

### Product Schema
\`\`\`typescript
const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().positive(),
  category: z.enum(['electronics', 'clothing', 'books']),
  inStock: z.boolean(),
  tags: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()),
});
\`\`\`

### Directory Schema
\`\`\`typescript
const DirectorySchema = z.object({
  name: z.string(),
  path: z.string(),
  isDirectory: z.boolean(),
  size: z.number().optional(),
  modifiedAt: z.date(),
  children: z.array(z.lazy(() => DirectorySchema)).optional(),
});
\`\`\`

## Usage

To generate your own diagrams:

\`\`\`typescript
import { z } from 'zod';
import { generateMermaidDiagram } from 'zod-mermaid';

const mySchema = z.object({
  // Your schema definition
});

const diagram = generateMermaidDiagram(mySchema, {
  diagramType: 'er', // 'er' | 'class' | 'flowchart'
  entityName: 'MyEntity', // Custom name for the top-level entity
  includeValidation: true,
  includeOptional: true,
});
\`\`\`
`;

    // Save to file
    const outputPath = join(process.cwd(), 'examples', 'mermaid-examples.md');
    writeFileSync(outputPath, markdownContent, 'utf8');

    // Verify the file was created
    expect(markdownContent).toContain('Zod Mermaid Examples');
    expect(markdownContent).toContain('erDiagram');
    expect(markdownContent).toContain('classDiagram');
    expect(markdownContent).toContain('flowchart TD');
  });
});
