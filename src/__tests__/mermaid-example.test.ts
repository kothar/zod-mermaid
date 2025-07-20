import { writeFileSync } from 'fs';
import { join } from 'path';

import { z } from 'zod';

import { generateMermaidDiagram, idRef } from '../mermaid-generator';

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
    }).describe('User');

    const ProductSchema = z.object({
      id: z.string(),
      name: z.string(),
      price: z.number().positive(),
      category: z.enum(['electronics', 'clothing', 'books']),
      inStock: z.boolean(),
      tags: z.array(z.string()),
      metadata: z.record(z.string(), z.unknown()),
    }).describe('Product');

    // Directory listing with self-referential types
    const DirectorySchema: z.ZodType<any> = z.object({
      name: z.string(),
      path: z.string(),
      isDirectory: z.boolean(),
      size: z.number().optional(),
      modifiedAt: z.date(),
      children: z.array(z.lazy(() => DirectorySchema)).optional(),
    }).describe('Directory');

    // Discriminated union example - API Response
    const ApiResponseSchema = z.discriminatedUnion('status', [
      z.object({
        status: z.literal('success'),
        data: z.object({
          id: z.string(),
          name: z.string(),
          email: z.email(),
        }),
        timestamp: z.date(),
      }).describe('ApiResponse_Success'),
      z.object({
        status: z.literal('error'),
        message: z.string(),
        code: z.number(),
        details: z.object({
          field: z.string().optional(),
          reason: z.string(),
        }).optional(),
      }).describe('ApiResponse_Error'),
    ]).describe('ApiResponse');

    const ProductEventPayloadSchema = z.discriminatedUnion('eventType', [
      z.object({
        eventType: z.literal('addProduct'),
        id: z.uuid(),
        name: z.string(),
        description: z.string(),
        location: z.string(),
      }).describe('AddProductEvent'),
      z.object({
        eventType: z.literal('removeProduct'),
        id: z.uuid(),
      }).describe('RemoveProductEvent'),
      z.object({
        eventType: z.literal('updateProduct'),
        id: z.uuid(),
        name: z.string(),
        description: z.string(),
        location: z.string(),
      }).describe('UpdateProductEvent'),
    ]).describe('ProductEventPayload');

    const EventSchema = z.object({
      id: z.string(),
      type: z.literal('com.example.event.product'),
      date: z.date(),
      data: ProductEventPayloadSchema,
    }).describe('Event');

    // Generate different types of diagrams
    const erDiagram = generateMermaidDiagram(UserSchema, { diagramType: 'er' });
    const classDiagram = generateMermaidDiagram(UserSchema, { diagramType: 'class' });
    const flowchartDiagram = generateMermaidDiagram(UserSchema, { diagramType: 'flowchart' });

    const productERDiagram = generateMermaidDiagram(ProductSchema, { diagramType: 'er' });

    const directoryERDiagram = generateMermaidDiagram(DirectorySchema, { diagramType: 'er' });
    const directoryClassDiagram = generateMermaidDiagram(DirectorySchema, { diagramType: 'class' });
    const directoryFlowchartDiagram = generateMermaidDiagram(DirectorySchema, { diagramType: 'flowchart' });

    const apiResponseERDiagram = generateMermaidDiagram(ApiResponseSchema, { diagramType: 'er' });
    const apiResponseClassDiagram = generateMermaidDiagram(ApiResponseSchema, { diagramType: 'class' });
    const apiResponseFlowchartDiagram = generateMermaidDiagram(ApiResponseSchema, { diagramType: 'flowchart' });

    const eventERDiagram = generateMermaidDiagram(EventSchema, { diagramType: 'er' });
    const eventClassDiagram = generateMermaidDiagram(EventSchema, { diagramType: 'class' });
    const eventFlowchartDiagram = generateMermaidDiagram(EventSchema, { diagramType: 'flowchart' });

    // ID Reference Example
    const CustomerSchema = z.object({
      id: z.uuid(),
      name: z.string(),
      email: z.email(),
    }).describe('Customer');

    const ProductRefSchema = z.object({
      id: z.uuid(),
      name: z.string(),
      price: z.number().positive(),
      category: z.enum(['electronics', 'clothing', 'books']),
    }).describe('Product');

    const OrderSchema = z.object({
      id: z.uuid(),
      customerId: idRef(CustomerSchema),
      productIds: z.array(idRef(ProductRefSchema)),
      quantity: z.number().positive(),
      orderDate: z.date(),
      status: z.enum(['pending', 'shipped', 'delivered']),
    }).describe('Order');

    const orderERDiagram = generateMermaidDiagram(OrderSchema, { diagramType: 'er' });
    const orderClassDiagram = generateMermaidDiagram(OrderSchema, { diagramType: 'class' });
    const orderFlowchartDiagram = generateMermaidDiagram(OrderSchema, { diagramType: 'flowchart' });

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

## API Response Schema Example (Discriminated Union)

### Entity-Relationship Diagram
\`\`\`mermaid
${apiResponseERDiagram}
\`\`\`

### Class Diagram
\`\`\`mermaid
${apiResponseClassDiagram}
\`\`\`

### Flowchart Diagram
\`\`\`mermaid
${apiResponseFlowchartDiagram}
\`\`\`

## Event Schema Example

### Entity-Relationship Diagram
\`\`\`mermaid
${eventERDiagram}
\`\`\`

### Class Diagram
\`\`\`mermaid
${eventClassDiagram}
\`\`\`

### Flowchart Diagram
\`\`\`mermaid
${eventFlowchartDiagram}
\`\`\`

## ID Reference Schema Example

### Entity-Relationship Diagram
\`\`\`mermaid
${orderERDiagram}
\`\`\`

### Class Diagram
\`\`\`mermaid
${orderClassDiagram}
\`\`\`

### Flowchart Diagram
\`\`\`mermaid
${orderFlowchartDiagram}
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
}).describe('User');
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
}).describe('Product');
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
}).describe('Directory');
\`\`\`

### API Response Schema (Discriminated Union)
\`\`\`typescript
const ApiResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('success'),
    data: z.object({
      id: z.string(),
      name: z.string(),
      email: z.email(),
    }),
    timestamp: z.date(),
  }).describe('ApiResponse_Success'),
  z.object({
    status: z.literal('error'),
    message: z.string(),
    code: z.number(),
    details: z.object({
      field: z.string().optional(),
      reason: z.string(),
    }).optional(),
  }).describe('ApiResponse_Error'),
]).describe('ApiResponse');
\`\`\`

### Event Schema
\`\`\`typescript
const ProductEventPayloadSchema = z.discriminatedUnion('eventType', [
  z.object({
    eventType: z.literal('addProduct'),
    id: z.uuid(),
    name: z.string(),
    description: z.string(),
    location: z.string(),
  }).describe('AddProductEvent'),
  z.object({
    eventType: z.literal('removeProduct'),
    id: z.uuid(),
  }).describe('RemoveProductEvent'),
  z.object({
    eventType: z.literal('updateProduct'),
    id: z.uuid(),
    name: z.string(),
    description: z.string(),
    location: z.string(),
  }).describe('UpdateProductEvent'),
]).describe('ProductEventPayload');

const EventSchema = z.object({
  id: z.string(),
  type: z.literal('com.example.event.product'),
  date: z.date(),
  data: ProductEventPayloadSchema,
}).describe('Event');
\`\`\`

### ID Reference Schema
\`\`\`typescript
const CustomerSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
}).describe('Customer');

const ProductSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  price: z.number().positive(),
  category: z.enum(['electronics', 'clothing', 'books']),
}).describe('Product');

const OrderSchema = z.object({
  id: z.uuid(),
  customerId: idRef(CustomerSchema),
  productId: idRef(ProductSchema),
  quantity: z.number().positive(),
  orderDate: z.date(),
  status: z.enum(['pending', 'shipped', 'delivered']),
}).describe('Order');
\`\`\`

**Note:** The \`idRef()\` function creates string fields that reference other entities by ID. This allows you to show relationships without embedding the full entity structure. The library automatically generates placeholder entities and relationships for referenced entities.

## Usage

To generate your own diagrams:

\`\`\`typescript
import { z } from 'zod';
import { generateMermaidDiagram } from 'zod-mermaid';

// Use .describe() to provide entity names
const mySchema = z.object({
  // Your schema definition
}).describe('MyEntity');

const diagram = generateMermaidDiagram(mySchema, {
  diagramType: 'er', // 'er' | 'class' | 'flowchart'
  includeValidation: true,
  includeOptional: true,
});
\`\`\`

**Note:** The library automatically uses the schema description (set with \`.describe()\`) as the entity name. If no description is provided, it will use the \`entityName\` option or default to 'Schema'.
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
