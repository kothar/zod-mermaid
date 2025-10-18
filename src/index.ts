/**
 * Zod Mermaid - Generate Mermaid diagrams from Zod schemas
 * @module zod-mermaid
 */

export { generateMermaidDiagram } from './mermaid-generator';
export type {
  MermaidOptions,
  DiagramType,
  MetadataRegistry,
  SchemaMetadata,
} from './mermaid-types';
export { ZodMermaidError } from './errors';
export * from './id-ref';
export { getGlobalMetadataRegistry } from './mermaid-generator';
