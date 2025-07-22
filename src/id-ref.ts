import { z } from 'zod';

/**
 * Creates a field that references another entity by ID, inferring the type from the referenced schema's id field.
 * This allows you to indicate relationships without embedding the full entity.
 *
 * @param schema - The Zod object schema representing the referenced entity
 * @param idFieldName - The name of the ID field in the referenced schema (default: 'id')
 * @param entityName - Optional custom name for the referenced entity
 * @returns A Zod schema for the ID field with reference metadata, with the type inferred from the referenced schema
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
  const shape = schema.shape;
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
  const targetEntityName = entityName || schema.description || 'Unknown';

  // Create a new schema with the same type and validation as the ID field
  const resultSchema = idFieldSchema.clone();

  // Add metadata to indicate this is an ID reference
  (resultSchema as any).__idRef = targetEntityName;

  return resultSchema as T['shape'][K];
} 