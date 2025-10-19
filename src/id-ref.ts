import { globalRegistry, z } from 'zod';
import { getEntityName } from './entity';

/**
 * Creates a field that references another entity by ID, inferring the type from the referenced
 * schema's id field.
 * This allows you to indicate relationships without embedding the full entity.
 *
 * @param schema - The Zod object schema representing the referenced entity
 * @param idFieldName - The name of the ID field in the referenced schema (default: 'id')
 * @param entityName - Optional custom name for the referenced entity
 * @returns A Zod schema for the ID field with reference metadata, with the type inferred from
 * the referenced schema
 *
 * @example
 * import { z } from 'zod';
 * import { idRef } from './id-ref';
 *
 * const CustomerSchema = z.object({ id: z.string() });
 * const OrderSchema = z.object({
 *   id: z.string(),
 *   customerId: idRef(CustomerSchema), // Inferred as ZodString
 * });
 */
export function idRef<
  T extends z.ZodObject<Record<string, z.ZodTypeAny>>,
  K extends keyof z.infer<T> & string = 'id'
>(
  schema: T,
  idFieldName?: K,
  entityName?: string,
): T['shape'][K] {
  const { shape } = schema;
  const field = idFieldName ?? 'id';

  if (!(field in shape)) {
    throw new Error(`ID field '${field}' not found in schema`);
  }

  // Get the ID field schema
  const idFieldSchema = shape[field];
  if (!idFieldSchema) {
    throw new Error(`ID field '${field}' not found in schema`);
  }

  // Use the provided entity name or the schema description
  const targetEntityName = entityName 
    || getEntityName(schema, 'Entity', globalRegistry)
    || getStringBrandKey(idFieldSchema);

  // Create a new schema with the same type and validation as the ID field
  const resultSchema = idFieldSchema.clone().meta({
    targetEntityName,
  });
  return resultSchema as T['shape'][K];
}


// Extracts a reasonable brand key for string IDs branded via z.string().brand('Key')
export function getStringBrandKey(schema: z.ZodTypeAny): unknown {
  const def: any = (schema as any).def ?? (schema as any)._def;
  if (!def) return undefined;
  // Zod 4 keeps brand in def.brand for branded schemas
  if (def.brand !== undefined) return def.brand;
  if (Array.isArray(def.branding) && def.branding.length > 0) return def.branding.slice();
  // Some builds might expose checks with brand info
  if (def.checks) {
    const brandCheck = def.checks.find((c: any) => c.kind === 'brand' || c.brand !== undefined);
    if (brandCheck) return brandCheck.brand ?? brandCheck.kind;
  }
  return undefined;
}