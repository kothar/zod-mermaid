#!/usr/bin/env node
/**
 * Script to regenerate all Mermaid diagrams in examples/multiple-schemas-example.md
 * 
 * This script extracts schema definitions from the examples file using comment markers
 * and regenerates all diagrams in place.
 * 
 * Usage:
 *   npm run regenerate:multiple-schemas
 *   OR
 *   tsx scripts/regenerate-multiple-schemas.ts
 */

import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { extractSchemaCode, executeSchemaCode } from './schema-utils';
import { generateMermaidDiagram } from '../src/mermaid-generator';

const EXAMPLES_FILE = join(process.cwd(), 'examples', 'multiple-schemas-example.md');

interface DiagramSection {
  marker: string;
  diagramType: 'er' | 'class' | 'flowchart';
  schemaNames: string[];
}

const diagramSections: DiagramSection[] = [
  { marker: 'multiple-schemas', diagramType: 'er', schemaNames: ['UserSchema', 'ProductSchema', 'OrderSchema'] },
  { marker: 'multiple-schemas', diagramType: 'class', schemaNames: ['UserSchema', 'ProductSchema', 'OrderSchema'] },
  { marker: 'multiple-schemas', diagramType: 'flowchart', schemaNames: ['UserSchema', 'ProductSchema', 'OrderSchema'] },
];

function main() {
  console.log('Reading multiple-schemas-example file...');
  const examplesContent = readFileSync(EXAMPLES_FILE, 'utf8');

  // Extract schema code from the examples file
  console.log('Extracting schema definitions...');
  const schemas: Record<string, any> = {};

  // Extract schema definitions
  const schemaCode = extractSchemaCode(examplesContent, 'multiple-schemas');
  if (!schemaCode) {
    console.error('Error: Could not find schema code for marker: multiple-schemas');
    process.exit(1);
  }

  console.log('Executing schema code...');
  const context = executeSchemaCode(schemaCode, schemas);
  Object.assign(schemas, context);

  // Generate all diagrams
  console.log('Generating diagrams...');
  let updatedContent = examplesContent;

  for (const section of diagramSections) {
    const { marker, diagramType, schemaNames } = section;

    // Get all schemas for this diagram
    const schemaArray = schemaNames.map(name => {
      if (!schemas[name]) {
        console.warn(`Warning: Schema ${name} not found in context`);
        return null;
      }
      return schemas[name];
    }).filter(s => s !== null);

    if (schemaArray.length === 0) {
      console.warn(`Warning: No schemas found for diagram: ${marker}-${diagramType}`);
      continue;
    }

    // Generate diagram from array of schemas
    const diagram = generateMermaidDiagram(schemaArray, { diagramType });

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

  console.log('✓ Multiple schemas example file regenerated successfully!');
}

main();
