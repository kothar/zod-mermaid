import { GlobalMeta, z } from 'zod';
import { MermaidOptions } from './mermaid-types';
import { $ZodRegistry } from 'zod/v4/core/registries.cjs';

/**
 * Gets the entity name from a schema
 * @param schema - The Zod schema
 * @param options - The diagram options
 * @param parentFieldName - The name of the parent field (for nested objects)
 * @returns The entity name
 */
export function getEntityName(
  schema: z.ZodTypeAny,
  defaultEntityName: string,
  registry: $ZodRegistry<GlobalMeta>,
  parentFieldName?: string,
): string {
  // Try to get name from schema metadata or use a default
  const meta = registry.get(schema);
  if (meta) {
    if (meta['entityName']) return meta['entityName'] as string;
    if (meta.title) return removeWhitespace(meta.title);
    if (meta.description) return removeWhitespace(meta.description);
  }

  // For nested objects, use the parent field name to create a descriptive name
  if (parentFieldName) {
    return parentFieldName.charAt(0).toUpperCase() + parentFieldName.slice(1);
  }

  // Fallback to configured default entity name for top-level entities
  const schemaType = schema.constructor.name;
  if (schemaType.includes('Object') || schemaType.includes('ZodDiscriminatedUnion')) {
    return defaultEntityName;
  }

  return defaultEntityName;
}

function removeWhitespace(str: string): string {
  return str.replace(/\s/g, '-');
}