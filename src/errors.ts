/**
 * Base error class for Zod Mermaid library
 */
export class ZodMermaidError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ZodMermaidError';
  }
}

/**
 * Error thrown when schema parsing fails
 */
export class SchemaParseError extends ZodMermaidError {
  public constructor(
    message: string,
    public readonly schema?: unknown,
  ) {
    super(`Schema parsing error: ${message}`);
    this.name = 'SchemaParseError';
  }
}

/**
 * Error thrown when diagram generation fails
 */
export class DiagramGenerationError extends ZodMermaidError {
  public constructor(
    message: string,
    public readonly diagramType?: string,
  ) {
    super(`Diagram generation error: ${message}`);
    this.name = 'DiagramGenerationError';
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends ZodMermaidError {
  public constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(`Validation error: ${message}`);
    this.name = 'ValidationError';
  }
}
