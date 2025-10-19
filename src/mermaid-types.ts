import { $ZodRegistry } from 'zod/v4/core/registries.cjs';

/**
 * Supported Mermaid diagram types
 */
export type DiagramType = 'er' | 'class' | 'flowchart';

/**
 * Options for generating Mermaid diagrams
 */
export interface MermaidOptions {
  /**
   * The type of diagram to generate
   * @default 'er'
   */
  diagramType?: DiagramType;

  /**
   * Whether to include validation rules in the diagram
   * @default true
   */
  includeValidation?: boolean;

  /**
   * Whether to include optional fields in the diagram
   * @default true
   */
  includeOptional?: boolean;

  /**
   * The name for the top-level entity/class
   * @default 'Entity'
   */
  entityName?: string;

  /**
   * Custom Zod metadata registry to use instead of the global one.
   * If omitted, the Zod global registry (if available) and schema-level metadata are used.
   */
  metadataRegistry?: $ZodRegistry<any>;
}

/**
 * Internal representation of a schema field
 */
export interface SchemaField {
  name: string;
  type: string;
  isOptional: boolean;
  validation?: string[];
  description?: string | undefined;
  /**
   * Whether this field is an ID reference to another entity
   */
  isIdReference?: boolean;
  /**
   * The name of the entity this field references (for ID references)
   */
  referencedEntity?: string | undefined;
}

/**
 * Internal representation of a schema entity
 */
export interface SchemaEntity {
  name: string;
  fields: SchemaField[];

  /**
   * Union relationships - for discriminated unions
   * Maps from base union entity to its subtypes with discriminator values
   */
  unionRelationships?: {
    baseEntity: string;
    subtypes: Array<{ name: string; discriminatorValue: string }>;
  };
}
