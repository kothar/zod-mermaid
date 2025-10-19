import { $ZodRegistry, GlobalMeta } from "zod/v4/core/registries.cjs";
import z from "zod";

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
   * Custom styling options
   */
  styling?: {
    /**
     * Primary color for entities
     * @default '#4CAF50'
     */
    primaryColor?: string;

    /**
     * Secondary color for relationships
     * @default '#2196F3'
     */
    secondaryColor?: string;
  };

  /**
   * Custom Zod metadata registry to use instead of the global one.
   * If omitted, the Zod global registry (if available) and schema-level metadata are used.
   */
  metadataRegistry?: $ZodRegistry<GlobalMeta>;
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
  /**
   * The brand key captured from the referenced entity's ID field, when available.
   * Used to disambiguate references when entity names are identical.
   */
  referencedBrandKey?: unknown;
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

  /**
   * Brand key derived from the entity's ID field (if branded).
   * Used for resolving references when names are ambiguous.
   */
  idBrandKey?: unknown;
}
