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
}

/**
 * Internal representation of a schema entity
 */
export interface SchemaEntity {
  name: string;
  fields: SchemaField[];
  description?: string | undefined;
}
