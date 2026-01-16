#!/usr/bin/env node
/**
 * Script to regenerate all Mermaid diagrams in examples/mermaid-examples.md
 * 
 * This script extracts schema definitions from the examples file using comment markers
 * and regenerates all diagrams in place.
 * 
 * Usage:
 *   npm run regenerate:examples
 *   OR
 *   tsx scripts/regenerate-examples.ts
 */

import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { extractSchemaCode, executeSchemaCode } from './schema-utils';
import { generateMermaidDiagram } from '../src/mermaid-generator';

const EXAMPLES_FILE = join(process.cwd(), 'examples', 'mermaid-examples.md');

interface DiagramSection {
  marker: string;
  diagramType: 'er' | 'class' | 'flowchart';
  schemaName: string;
}

const diagramSections: DiagramSection[] = [
  // User Schema Examples
  { marker: 'user', diagramType: 'er', schemaName: 'UserSchema' },
  { marker: 'user', diagramType: 'class', schemaName: 'UserSchema' },
  { marker: 'user', diagramType: 'flowchart', schemaName: 'UserSchema' },

  // Product Schema Example
  { marker: 'product', diagramType: 'er', schemaName: 'ProductSchema' },

  // Directory Schema Example
  { marker: 'directory', diagramType: 'er', schemaName: 'DirectorySchema' },
  { marker: 'directory', diagramType: 'class', schemaName: 'DirectorySchema' },
  { marker: 'directory', diagramType: 'flowchart', schemaName: 'DirectorySchema' },

  // API Response Schema Example
  { marker: 'api-response', diagramType: 'er', schemaName: 'ApiResponseSchema' },
  { marker: 'api-response', diagramType: 'class', schemaName: 'ApiResponseSchema' },
  { marker: 'api-response', diagramType: 'flowchart', schemaName: 'ApiResponseSchema' },

  // Event Schema Example
  { marker: 'event', diagramType: 'er', schemaName: 'EventSchema' },
  { marker: 'event', diagramType: 'class', schemaName: 'EventSchema' },
  { marker: 'event', diagramType: 'flowchart', schemaName: 'EventSchema' },

  // Additional Types Example
  { marker: 'additional-types', diagramType: 'er', schemaName: 'AdditionalTypesSchema' },
  { marker: 'additional-types', diagramType: 'class', schemaName: 'AdditionalTypesSchema' },
  { marker: 'additional-types', diagramType: 'flowchart', schemaName: 'AdditionalTypesSchema' },

  // ID Reference Schema Example
  { marker: 'id-ref', diagramType: 'er', schemaName: 'OrderSchema' },
  { marker: 'id-ref', diagramType: 'class', schemaName: 'OrderSchema' },
  { marker: 'id-ref', diagramType: 'flowchart', schemaName: 'OrderSchema' },
];

function main() {
  console.log('Reading examples file...');
  const examplesContent = readFileSync(EXAMPLES_FILE, 'utf8');

  // Extract schema code from the examples file
  console.log('Extracting schema definitions...');
  const schemas: Record<string, any> = {};

  // Extract all schema definitions in order
  const schemaMarkers = [
    'user',
    'product',
    'directory',
    'api-response',
    'event',
    'additional-types',
    'id-ref',
  ];

  for (const marker of schemaMarkers) {
    const schemaCode = extractSchemaCode(examplesContent, marker);
    if (!schemaCode) {
      console.warn(`Warning: Could not find schema code for marker: ${marker}`);
      continue;
    }

    console.log(`Executing schema code for: ${marker}`);
    const context = executeSchemaCode(schemaCode, schemas);
    Object.assign(schemas, context);
  }

  // Generate all diagrams
  console.log('Generating diagrams...');
  let updatedContent = examplesContent;

  for (const section of diagramSections) {
    const { marker, diagramType, schemaName } = section;

    if (!schemas[schemaName]) {
      console.warn(`Warning: Schema ${schemaName} not found in context`);
      continue;
    }

    const schema = schemas[schemaName];
    const diagram = generateMermaidDiagram(schema, { diagramType });

    // Find and replace the diagram section
    const diagramMarker = `${marker}-${diagramType}`;
    const startMarker = `<!-- DIAGRAM: ${diagramMarker} START -->`;
    const endMarker = `<!-- DIAGRAM: ${diagramMarker} END -->`;

    const startIndex = updatedContent.indexOf(startMarker);
    if (startIndex === -1) {
      console.warn(`Warning: Could not find start marker for diagram: ${diagramMarker}`);
      continue;
    }

    const endIndex = updatedContent.indexOf(endMarker, startIndex);
    if (endIndex === -1) {
      console.warn(`Warning: Could not find end marker for diagram: ${diagramMarker}`);
      continue;
    }

    // Extract the section and replace the diagram
    const beforeSection = updatedContent.substring(0, startIndex + startMarker.length);
    const afterSection = updatedContent.substring(endIndex);

    const newDiagramSection = `\n\`\`\`mermaid\n${diagram}\n\`\`\`\n`;
    updatedContent = beforeSection + newDiagramSection + afterSection;

    console.log(`Updated diagram: ${diagramMarker}`);
  }

  // Write the updated content back to the file
  console.log('Writing updated examples file...');
  writeFileSync(EXAMPLES_FILE, updatedContent, 'utf8');

  console.log('✓ Examples file regenerated successfully!');
}

main();
