/** @module entity */
import type { z } from 'zod';

/**
 * Gets the entity name from a schema
 * @param schema - The Zod schema
 * @param registry - The metadata registry
 * @param parentFieldName - The name of the parent field (for nested objects)
 * @returns The original label; Mermaid escaping is applied by the renderer.
 * @example getEntityName(z.object({}).describe('User profile'), z.globalRegistry);
 */
export function getEntityName(
  schema: z.core.$ZodType,
  registry: z.core.$ZodRegistry<z.core.GlobalMeta>,
  parentFieldName?: string,
): string | undefined {
  // Try to get name from schema metadata or use a default
  const meta = registry.get(schema);
  if (meta) {
    if (typeof meta['entityName'] === 'string' && meta['entityName']) return meta['entityName'];
    if (meta.title) return meta.title;
    if (meta.description) return meta.description;
  }

  // For nested objects, use the parent field name to create a descriptive name
  if (parentFieldName) {
    return parentFieldName.charAt(0).toUpperCase() + parentFieldName.slice(1);
  }

  return undefined;
}
