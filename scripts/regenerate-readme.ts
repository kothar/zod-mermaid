#!/usr/bin/env node
/**
 * Script to regenerate all Mermaid diagrams in README.md
 * 
 * This script reads the schemas defined in the README examples,
 * generates fresh Mermaid diagrams, and updates the README with the new output.
 * 
 * Usage:
 *   npm run regenerate-readme
 *   OR
 *   tsx scripts/regenerate-readme.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { generateMermaidDiagram } from '../src/mermaid-generator';
import { extractSchemaCode, executeSchemaCode, replaceDiagramByMarker } from './schema-utils';

// Read the current README to extract schemas
const readmePath = join(process.cwd(), 'README.md');
let readme = readFileSync(readmePath, 'utf8');

console.log('Extracting schemas from README...');

// Extract schema code from README
const productCode = extractSchemaCode(readme, 'product');
const directoryCode = extractSchemaCode(readme, 'directory');
const nestedUserCode = extractSchemaCode(readme, 'nested-user');
const eventCode = extractSchemaCode(readme, 'event');
const orderCode = extractSchemaCode(readme, 'order');

// Execute schemas in order, building up a shared context
// This allows later schemas to reference earlier ones
const sharedContext: Record<string, any> = {};

const productSchemas = productCode ? executeSchemaCode(productCode, sharedContext) : null;
if (productSchemas) Object.assign(sharedContext, productSchemas);

const directorySchemas = directoryCode ? executeSchemaCode(directoryCode, sharedContext) : null;
if (directorySchemas) Object.assign(sharedContext, directorySchemas);

const nestedUserSchemas = nestedUserCode ? executeSchemaCode(nestedUserCode, sharedContext) : null;
if (nestedUserSchemas) Object.assign(sharedContext, nestedUserSchemas);

const eventSchemas = eventCode ? executeSchemaCode(eventCode, sharedContext) : null;
if (eventSchemas) Object.assign(sharedContext, eventSchemas);

const orderSchemas = orderCode ? executeSchemaCode(orderCode, sharedContext) : null;
if (orderSchemas) Object.assign(sharedContext, orderSchemas);

// For User class/flowchart examples, we need to define it since it's not in a SCHEMA marker
const UserSchemaForClassAndFlowchart = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(100),
  email: z.email(),
  age: z.number().min(0).max(120),
  profile: z.object({
    bio: z.string().optional(),
    avatar: z.url().optional(),
  }),
});

console.log('Generating diagrams from extracted schemas...');

// Generate all diagrams using extracted schemas
const diagrams = {
  productER: productSchemas?.ProductSchema 
    ? generateMermaidDiagram(productSchemas.ProductSchema, { diagramType: 'er', entityName: 'Product' })
    : '',
  userClass: generateMermaidDiagram(UserSchemaForClassAndFlowchart, { diagramType: 'class', entityName: 'User' }),
  userFlowchart: generateMermaidDiagram(UserSchemaForClassAndFlowchart, { diagramType: 'flowchart', entityName: 'User' }),
  directoryER: directorySchemas?.DirectorySchema
    ? generateMermaidDiagram(directorySchemas.DirectorySchema, { diagramType: 'er', entityName: 'Directory' })
    : '',
  nestedUserER: nestedUserSchemas?.UserSchema
    ? generateMermaidDiagram(nestedUserSchemas.UserSchema, { diagramType: 'er', entityName: 'User' })
    : '',
  eventER: eventSchemas?.EventSchema
    ? generateMermaidDiagram(eventSchemas.EventSchema, { diagramType: 'er' })
    : '',
  eventClass: eventSchemas?.EventSchema
    ? generateMermaidDiagram(eventSchemas.EventSchema, { diagramType: 'class' })
    : '',
  orderER: orderSchemas?.OrderSchema
    ? generateMermaidDiagram(orderSchemas.OrderSchema, { diagramType: 'er' })
    : '',
  orderClass: orderSchemas?.OrderSchema
    ? generateMermaidDiagram(orderSchemas.OrderSchema, { diagramType: 'class' })
    : '',
};

console.log('✓ All diagrams generated successfully');

console.log('Updating README.md...');

// Replace only diagrams using HTML comment markers
// Schema code remains in README as the source of truth
const replacements = [
  {
    name: 'Product ER Diagram',
    diagramMarker: 'product-er',
    diagram: diagrams.productER,
  },
  {
    name: 'User Class Diagram',
    diagramMarker: 'user-class',
    diagram: diagrams.userClass,
  },
  {
    name: 'User Flowchart Diagram',
    diagramMarker: 'user-flowchart',
    diagram: diagrams.userFlowchart,
  },
  {
    name: 'Directory ER Diagram',
    diagramMarker: 'directory-er',
    diagram: diagrams.directoryER,
  },
  {
    name: 'Nested User ER Diagram',
    diagramMarker: 'nested-user-er',
    diagram: diagrams.nestedUserER,
  },
  {
    name: 'Event ER Diagram',
    diagramMarker: 'event-er',
    diagram: diagrams.eventER,
  },
  {
    name: 'Event Class Diagram',
    diagramMarker: 'event-class',
    diagram: diagrams.eventClass,
  },
  {
    name: 'Order ER Diagram',
    diagramMarker: 'order-er',
    diagram: diagrams.orderER,
  },
  {
    name: 'Order Class Diagram',
    diagramMarker: 'order-class',
    diagram: diagrams.orderClass,
  },
];

let successCount = 0;
let unchangedCount = 0;

for (const replacement of replacements) {
  // Update only the diagram (schemas in README are the source of truth)
  const diagramResult = replaceDiagramByMarker(
    readme,
    replacement.diagramMarker,
    replacement.diagram
  );
  
  if (diagramResult !== readme) {
    readme = diagramResult;
    console.log(`✓ Updated: ${replacement.name}`);
    successCount++;
  } else {
    unchangedCount++;
  }
}

// Write the updated README
writeFileSync(readmePath, readme, 'utf8');

if (successCount > 0) {
  console.log(`\n✓ README.md updated successfully (${successCount}/${replacements.length} diagrams changed)`);
} else if (unchangedCount === replacements.length) {
  console.log(`\n✓ All diagrams are already up-to-date`);
} else {
  console.log(`\n⚠ Some diagrams could not be updated (${unchangedCount} unchanged, ${replacements.length - unchangedCount - successCount} errors)`);
}
