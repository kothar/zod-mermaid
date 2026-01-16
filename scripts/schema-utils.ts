/**
 * Shared utilities for extracting and executing Zod schema code from markdown files
 */

import { z } from 'zod';
import { generateMermaidDiagram } from '../src/mermaid-generator';
import { idRef } from '../src/id-ref';

/**
 * Extract schema code from markdown content using HTML comment markers
 * @param content - The markdown content
 * @param marker - The marker name (e.g., 'product' for <!-- SCHEMA: product START/END -->)
 * @returns The extracted TypeScript code, or null if not found
 */
export function extractSchemaCode(content: string, marker: string): string | null {
  const startMarker = `<!-- SCHEMA: ${marker} START -->`;
  const endMarker = `<!-- SCHEMA: ${marker} END -->`;
  
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) return null;

  const endIndex = content.indexOf(endMarker, startIndex);
  if (endIndex === -1) return null;

  const section = content.substring(startIndex + startMarker.length, endIndex);
  
  // Extract code from TypeScript code block
  const tsMatch = section.match(/```typescript\n([\s\S]*?)\n```/);
  return tsMatch ? tsMatch[1] : null;
}

/**
 * Extract variable names from schema code (excluding 'diagram')
 * @param code - The TypeScript code
 * @returns Array of variable names defined with const
 */
export function extractVariableNames(code: string): string[] {
  // Match both `const name =` and `const name: type =`
  const matches = code.matchAll(/const\s+(\w+)\s*(?::\s*[^=]+)?\s*=/g);
  return Array.from(matches, m => m[1]).filter(name => name !== 'diagram');
}

/**
 * Execute schema code in a shared context
 * @param code - The TypeScript code to execute
 * @param sharedContext - Shared context with previously defined schemas
 * @returns Object containing the defined variables
 */
export function executeSchemaCode(
  code: string, 
  sharedContext: Record<string, any> = {}
): Record<string, any> {
  // Create a context with the necessary imports and shared schemas
  const context: Record<string, any> = {
    z,
    idRef,
    generateMermaidDiagram,
    ...sharedContext,
  };
  
  // Strip TypeScript type annotations from the code
  // This handles cases like: const DirectorySchema: z.ZodType<any> = ...
  const jsCode = code.replace(/const\s+(\w+)\s*:\s*[^=]+=/g, 'const $1 =');
  
  // Execute the code and capture defined variables
  const variableNames = extractVariableNames(code);
  
  // Create a wrapper that declares variables in the outer scope
  const wrappedCode = `
    (function(${Object.keys(context).join(', ')}) {
      ${jsCode}
      return { ${variableNames.map(name => `${name}: ${name}`).join(', ')} };
    })(${Object.keys(context).map(k => 'context.' + k).join(', ')})
  `;
  
  try {
    const result = eval(wrappedCode);
    return result;
  } catch (error) {
    console.error(`Error executing schema code: ${error}`);
    return {};
  }
}

/**
 * Helper function to replace a diagram section using HTML comment markers
 * @param content - The full markdown content
 * @param marker - The marker name (e.g., 'product-er' for <!-- DIAGRAM: product-er START/END -->)
 * @param diagram - The new diagram content to insert (just the mermaid code, without the ```mermaid wrapper)
 * @returns The updated content
 */
export function replaceDiagramByMarker(
  content: string,
  marker: string,
  diagram: string,
): string {
  const startMarker = `<!-- DIAGRAM: ${marker} START -->`;
  const endMarker = `<!-- DIAGRAM: ${marker} END -->`;
  
  const startIndex = content.indexOf(startMarker);
  if (startIndex === -1) {
    return content;
  }

  const endIndex = content.indexOf(endMarker, startIndex);
  if (endIndex === -1) {
    return content;
  }

  // Get content between markers
  const sectionStart = startIndex + startMarker.length;
  const oldSection = content.substring(sectionStart, endIndex);
  
  // Find the mermaid code block
  const mermaidMarker = '```mermaid';
  const mermaidStart = oldSection.indexOf(mermaidMarker);
  if (mermaidStart === -1) {
    return content;
  }
  
  // Find where the actual code starts (after ```mermaid and the newline)
  const codeStart = mermaidStart + mermaidMarker.length;
  const firstNewline = oldSection.indexOf('\n', codeStart);
  if (firstNewline === -1) {
    return content;
  }
  
  // Find the closing ```
  const codeEnd = oldSection.indexOf('\n```', firstNewline);
  if (codeEnd === -1) {
    return content;
  }
  
  // Preserve everything before the code and after the code
  const prefix = oldSection.substring(0, firstNewline + 1);
  const suffix = oldSection.substring(codeEnd);
  
  // Build the new section
  const newSection = prefix + diagram + suffix;
  
  // Reconstruct the full content
  return content.substring(0, sectionStart) + newSection + content.substring(endIndex);
}
