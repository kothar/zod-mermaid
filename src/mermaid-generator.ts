import { $ZodRegistry } from 'zod/v4/core/registries.cjs';

import { z, ZodNumber } from 'zod';
import type { MermaidOptions, SchemaEntity } from './mermaid-types';
import { DiagramGenerationError, SchemaParseError, ZodMermaidError } from './errors';
import { getEntityName } from './entity';

/**
 * Default options for Mermaid diagram generation
 */
const DEFAULT_OPTIONS: Required<Omit<MermaidOptions, 'metadataRegistry'>> & Pick<MermaidOptions, 'metadataRegistry'> = {
  diagramType: 'er',
  includeValidation: true,
  includeOptional: true,
  entityName: 'Entity',
  metadataRegistry: z.globalRegistry,
};

/**
 * Generates a Mermaid diagram from one or more Zod schemas
 * @param schema - The Zod schema(s) to convert to a diagram.
 * Can be a single schema or an array of schemas
 * @param options - Options for diagram generation
 * @returns A Mermaid diagram string
 * @throws {SchemaParseError} When schema parsing fails
 * @throws {DiagramGenerationError} When diagram generation fails
 */
export function generateMermaidDiagram(
  schema: z.ZodTypeAny | z.ZodTypeAny[],
  options: MermaidOptions = {},
): string {
  try {
    const mergedOptions: Required<MermaidOptions> = {
      ...DEFAULT_OPTIONS,
      ...options,
    } as any;
    const registry = mergedOptions.metadataRegistry;

    // Handle both single schema and array of schemas
    const schemas = Array.isArray(schema) ? schema : [schema];
    const allEntities: SchemaEntity[] = [];

    // Parse each schema and collect all entities
    for (const singleSchema of schemas) {
      const entities = parseSchemaToEntities(singleSchema, mergedOptions, registry);
      allEntities.push(...entities);
    }

    switch (mergedOptions.diagramType) {
    case 'er':
      return generateERDiagram(allEntities, mergedOptions);
    case 'class':
      return generateClassDiagram(allEntities);
    case 'flowchart':
      return generateFlowchartDiagram(allEntities);
    default:
      throw new DiagramGenerationError(
        `Unsupported diagram type: ${mergedOptions.diagramType}`,
        mergedOptions.diagramType,
      );
    }
  } catch (error) {
    if (error instanceof ZodMermaidError) {
      throw error;
    }
    throw new SchemaParseError(
      `Failed to generate diagram: ${error instanceof Error ? error.message : 'Unknown error'}`,
      schema,
    );
  }
}

/**
 * Parses a Zod schema into internal entity representation
 * @param schema - The Zod schema to parse
 * @param options - The diagram options
 * @param parentFieldName - The name of the parent field (for nested objects)
 * @returns Array of schema entities
 */
function parseSchemaToEntities(
  schema: z.ZodTypeAny,
  options: Required<Omit<MermaidOptions, 'metadataRegistry'>>,
  registry: $ZodRegistry<any>,
  parentFieldName?: string,
): SchemaEntity[] {
  const entities: SchemaEntity[] = [];
  const idReferences = new Set<string>();

  // Handle top-level lazy schemas by unwrapping before proceeding
  if (schema.def.type === 'lazy') {
    try {
      const lazySchema = schema as z.ZodLazy<any>;
      const resolvedSchema = lazySchema.unwrap();
      return parseSchemaToEntities(resolvedSchema, options, registry, parentFieldName);
    } catch {
      // If unable to resolve, return empty entities
      return entities;
    }
  }

  // Check if it's an object schema
  if (schema.def.type === 'object') {
    const objectSchema = schema as z.ZodObject<Record<string, z.ZodTypeAny>>;
    const { shape } = objectSchema;
    const entityName = getEntityName(schema, registry, parentFieldName) || options.entityName;

    const fields = Object.entries(shape).map(([key, value]) => {
      const fieldSchema = value as z.ZodTypeAny;
      const fieldType = getFieldType(fieldSchema, key, entityName, registry);
      const isOptional = isFieldOptional(fieldSchema);
      const validation = getFieldValidation(fieldSchema, registry);

      // Track ID references for placeholder entity creation
      // Handle direct ID refs, optional ID refs, and arrays of ID refs
      let isIdRef = false;
      let referencedEntity: string | undefined = undefined;

      const fieldMeta = registry.get(fieldSchema);
      if (fieldType === 'string' && fieldMeta?.['targetEntityName']) {
        isIdRef = true;
        referencedEntity = fieldMeta['targetEntityName'] as string;
      } else if (isOptional && fieldSchema.def.type === 'optional') {
        // For optional fields, check if the unwrapped schema is an ID ref
        const unwrappedSchema = (fieldSchema as z.ZodOptional<any>).unwrap();
        const unwrappedMeta = registry.get(unwrappedSchema);
        if (unwrappedSchema.def.type === 'string' && unwrappedMeta?.['targetEntityName']) {
          isIdRef = true;
          referencedEntity = unwrappedMeta['targetEntityName'] as string;
        }
      } else if (fieldSchema.def.type === 'array') {
        // For arrays, check if the element is an ID ref
        const arraySchema = fieldSchema as z.ZodArray<any>;
        const elementSchema = arraySchema.element;
        const elementMeta = registry.get(elementSchema);
        if (elementSchema.def.type === 'string' && elementMeta?.['targetEntityName']) {
          isIdRef = true;
          referencedEntity = elementMeta['targetEntityName'] as string;
        }
      }

      if (isIdRef && referencedEntity) {
        idReferences.add(referencedEntity);
      }

      return {
        name: key,
        type: fieldType,
        isOptional,
        validation,
        isIdReference: isIdRef,
        referencedEntity,
      };
    });

    entities.push({
      name: entityName,
      fields,
    });

    // Recursively parse nested objects and unions
    for (const [key, value] of Object.entries(shape)) {
      let fieldSchema = value as z.ZodTypeAny;
      // Unwrap optional, nullable, and default wrappers using type guards
      let unwrapped = true;
      while (unwrapped) {
        unwrapped = false;
        if (fieldSchema.def.type === 'optional' && 'unwrap' in fieldSchema) {
          fieldSchema = (fieldSchema as z.ZodOptional<any>).unwrap();
          unwrapped = true;
        } else if (fieldSchema.def.type === 'nullable' && 'unwrap' in fieldSchema) {
          fieldSchema = (fieldSchema as z.ZodNullable<any>).unwrap();
          unwrapped = true;
        } else if (fieldSchema.def.type === 'default' && 'unwrap' in fieldSchema) {
          fieldSchema = (fieldSchema as z.ZodDefault<any>).unwrap();
          unwrapped = true;
        }
      }
      if (fieldSchema.def.type === 'object') {
        const nestedEntities = parseSchemaToEntities(fieldSchema, options, registry, key);
        entities.push(...nestedEntities);
      } else if (fieldSchema.def.type === 'union' && (fieldSchema.def as any).discriminator) {
        // Handle discriminated unions as nested fields
        const nestedEntities = parseSchemaToEntities(fieldSchema, options, registry, key);
        entities.push(...nestedEntities);
      } else if (fieldSchema.def.type === 'lazy') {
        // Handle lazy types that might contain objects
        try {
          const lazySchema = fieldSchema as z.ZodLazy<any>;
          const resolvedSchema = lazySchema.unwrap();
          if (resolvedSchema.def.type === 'object') {
            const nestedEntities = parseSchemaToEntities(
              resolvedSchema,
              options,
              registry,
              key,
            );
            entities.push(...nestedEntities);
          } else if (
            resolvedSchema.def.type === 'union' && (resolvedSchema.def as any).discriminator
          ) {
            // Handle discriminated unions in lazy types
            const nestedEntities = parseSchemaToEntities(
              resolvedSchema,
              options,
              registry,
              key,
            );
            entities.push(...nestedEntities);
          }
        } catch {
          // If we can't resolve the lazy schema, skip it
        }
      }
    }
  }

  // Check if it's a discriminated union
  if (schema.def.type === 'union' && (schema.def as any).discriminator) {
    const unionDef = schema.def as any;
    const { options: unionOptions, discriminator } = unionDef;

    // Create a base entity for the union
    const unionEntityName = getEntityName(schema, registry, parentFieldName) || options.entityName;

    // Extract discriminator values
    const discriminatorValues = unionOptions.map((opt: any) => {
      const optionDef = opt.def as any;
      const discField = optionDef.shape[discriminator];
      const values: unknown[] = (discField?.def?.values ?? []) as unknown[];
      const [first] = values;
      return first as string;
    });

    // Add discriminator field to the base entity
    const discriminatorField = {
      name: discriminator,
      type: 'string',
      isOptional: false,
      validation: [`enum: ${discriminatorValues.join(', ')}`],
      description: undefined,
    };

    // Track union subtypes for relationship generation
    const unionSubtypes: Array<{ name: string; discriminatorValue: string }> = [];

    entities.push({
      name: unionEntityName,
      fields: [discriminatorField],
      unionRelationships: {
        baseEntity: unionEntityName,
        subtypes: unionSubtypes,
      },
    });

    // Parse each union option as a separate entity
    for (const option of unionOptions) {
      const optionSchema = option as z.ZodTypeAny;

      if (optionSchema.def.type === 'object') {
        const optionDef = optionSchema.def as any;
        const discriminatorField = optionDef.shape[discriminator];
        const values = (discriminatorField?.def?.values ?? []) as unknown[];
        const [rawValue] = values;
        const discriminatorValue: string = String(rawValue ?? '');

        // Use the schema description if available, otherwise fall back to the generic naming
        const optionEntityName = getEntityName(optionSchema, registry)
          || `${unionEntityName}_${discriminatorValue}`;

        // Create the option entity with all fields except the discriminator
        const optionFields = Object.entries(optionDef.shape)
          .filter(([key]) => key !== discriminator) // Exclude discriminator field
          .map(([key, value]) => {
            const fieldSchema = value as z.ZodTypeAny;
            const fieldType = getFieldType(fieldSchema, key, optionEntityName, registry);
            const isOptional = isFieldOptional(fieldSchema);
            const validation = getFieldValidation(fieldSchema, registry);

            return {
              name: key,
              type: fieldType,
              isOptional,
              validation,
            };
          });

        entities.push({
          name: optionEntityName,
          fields: optionFields,
        });

        // Add to union subtypes tracking with discriminator value
        unionSubtypes.push({ name: optionEntityName, discriminatorValue });

        // Recursively parse nested objects in the option
        for (const [key, value] of Object.entries(optionDef.shape)) {
          if (key === discriminator) continue; // Skip discriminator field

          const fieldSchema = value as z.ZodTypeAny;
          if (fieldSchema.def.type === 'object') {
            const nestedEntities = parseSchemaToEntities(fieldSchema, options, registry, key);
            entities.push(...nestedEntities);
          } else if (fieldSchema.def.type === 'lazy') {
            // Handle lazy types that might contain objects
            try {
              const lazySchema = fieldSchema as z.ZodLazy<any>;
              const resolvedSchema = lazySchema.unwrap();
              if (resolvedSchema.def.type === 'object') {
                const nestedEntities = parseSchemaToEntities(
                  resolvedSchema,
                  options,
                  registry,
                  key,
                );
                entities.push(...nestedEntities);
              }
            } catch {
              // If we can't resolve the lazy schema, skip it
            }
          }
        }
      }
    }
  }

  // Add placeholder entities for ID references that aren't in the current schema
  for (const referencedEntityName of idReferences) {
    // Check if this entity is already in the entities array
    const existingEntity = entities.find(e => e.name === referencedEntityName);
    if (!existingEntity) {
      // Create a placeholder entity with no fields
      // The entity references are shown in the relationships section
      entities.push({
        name: referencedEntityName,
        fields: [],
      });
    }
  }

  return entities;
}

/**
 * Gets the field type from a Zod schema.
 *
 * Determines the TypeScript-like type string for a given Zod field, handling primitives,
 * arrays, objects, enums, records, and wrapped types (optional, nullable, default, lazy).
 * For object types, returns a reference to the entity name (derived from the field name).
 * For lazy types, attempts to resolve the underlying schema and handles self-referential types.
 *
 * @param schema - The Zod schema for the field
 * @param fieldName - The name of the field (used for object/entity references)
 * @param entityName - The name of the parent entity (used for self-referential/lazy types)
 * @param registry - The Zod metadata registry for extracting entity names
 * @returns The field type as a string (e.g., 'string', 'number[]', 'Entity', etc.)
 *
 * @example
 * getFieldType(z.string(), 'name', 'User', registry) // 'string'
 * getFieldType(z.array(z.number()), 'scores', 'User', registry) // 'number[]'
 * getFieldType(z.object({...}), 'profile', 'User', registry) // 'Profile'
 * getFieldType(z.lazy(() => UserSchema), 'parent', 'User', registry) // 'User'
 */
function getFieldType(
  schema: z.ZodTypeAny,
  fieldName: string,
  entityName: string,
  registry: $ZodRegistry<any>,
): string {
  const { type } = schema.def;

  switch (type) {
  case 'string':
    return 'string';
  case 'number':
    return 'number';
  case 'bigint':
    return 'bigint';
  case 'boolean':
    return 'boolean';
  case 'date':
    return 'date';
  case 'symbol':
    return 'symbol';
  case 'null':
    return 'null';
  case 'undefined':
    return 'undefined';
  case 'array': {
    const arraySchema = schema as z.ZodArray<any>;
    const arrayType = getFieldType(arraySchema.element, fieldName, entityName, registry);
    return `${arrayType}[]`;
  }
  case 'object':
    // For objects, use the schema description if available, otherwise use field name
    return getEntityName(schema, registry, fieldName)
      || (fieldName ? fieldName.charAt(0).toUpperCase() + fieldName.slice(1) : 'Entity');
  case 'enum':
    return 'string';
  case 'literal': {
    const literalDef = schema.def as any;
    const [literalValue] = literalDef.values;
    // For literal types, return the actual type, not the literal value
    // The literal value will be handled in validation
    if (typeof literalValue === 'string') {
      return 'string';
    }
    if (typeof literalValue === 'number') {
      return 'number';
    }
    if (typeof literalValue === 'boolean') {
      return 'boolean';
    }
    return typeof literalValue;
  }
  case 'record': {
    const recordDef = schema.def as any;
    const keyType = getFieldType(recordDef.keyType, fieldName, entityName, registry);
    const valueType = getFieldType(recordDef.valueType, fieldName, entityName, registry);
    return `Record<${keyType}, ${valueType}>`;
  }
  case 'map': {
    const mapDef = schema.def as any;
    const keyType = getFieldType(mapDef.keyType, fieldName, entityName, registry);
    const valueType = getFieldType(mapDef.valueType, fieldName, entityName, registry);
    return `Map<${keyType}, ${valueType}>`;
  }
  case 'set': {
    const setDef = schema.def as any;
    const valueType = getFieldType(setDef.valueType, fieldName, entityName, registry);
    return `Set<${valueType}>`;
  }
  case 'promise': {
    const promiseDef = schema.def as any;
    const inner: z.ZodTypeAny | undefined =
      promiseDef.innerType || promiseDef.type || promiseDef.itemType || promiseDef.schema;
    const innerType = inner && typeof inner === 'object' && 'def' in inner
      ? getFieldType(inner as z.ZodTypeAny, fieldName, entityName, registry)
      : 'unknown';
    return `Promise<${innerType}>`;
  }
  case 'tuple': {
    const tupleDef = schema.def as any;
    const items: z.ZodTypeAny[] = (tupleDef.items as z.ZodTypeAny[]) || [];
    const itemTypes = items.map(item => getFieldType(item, fieldName, entityName, registry));
    if (tupleDef.rest) {
      const restType = getFieldType(tupleDef.rest as z.ZodTypeAny, fieldName, entityName, registry);
      itemTypes.push(`...${restType}[]`);
    }
    return `[${itemTypes.join(', ')}]`;
  }
  case 'optional': {
    const optionalSchema = schema as z.ZodOptional<any>;
    return getFieldType(optionalSchema.unwrap(), fieldName, entityName, registry);
  }
  case 'nullable': {
    const nullableSchema = schema as z.ZodNullable<any>;
    return getFieldType(nullableSchema.unwrap(), fieldName, entityName, registry);
  }
  case 'default': {
    const defaultSchema = schema as z.ZodDefault<any>;
    return getFieldType(defaultSchema.unwrap(), fieldName, entityName, registry);
  }
  case 'lazy': {
    const lazySchema = schema as z.ZodLazy<any>;
    // For lazy types, we need to resolve the schema to get the actual type
    try {
      const resolvedSchema = lazySchema.unwrap();
      // Check if this is a self-referential type by comparing the resolved schema
      // with the parent schema (if available)
      if (resolvedSchema.def.type === 'object') {
        // For self-referential types, return the entity name
        return entityName || 'Entity';
      }
      return getFieldType(resolvedSchema, fieldName, entityName, registry);
    } catch {
      // If we can't resolve the lazy schema, return a generic reference
      return 'Entity';
    }
  }
  case 'union': {
    // Handle discriminated unions
    const unionDef = schema.def as any;
    if (unionDef.discriminator) {
      // For discriminated unions, return the base entity name
      // The actual entity name will be determined during parsing
      // We need to get the entity name from the schema description or field name
      return getEntityName(schema, registry, fieldName)
        || (fieldName ? fieldName.charAt(0).toUpperCase() + fieldName.slice(1) : 'Union');
    }
    // For regular (non-discriminated) unions, render joined option types
    const optionTypes: string[] = (unionDef.options as z.ZodTypeAny[])
      ?.map((opt: z.ZodTypeAny) => getFieldType(opt, fieldName, entityName, registry))
      ?? [];
    return optionTypes.length ? optionTypes.join(' | ') : 'union';
  }
  case 'intersection': {
    const intDef = schema.def as any;
    const left = intDef.left as z.ZodTypeAny | undefined;
    const right = intDef.right as z.ZodTypeAny | undefined;
    const leftType = left ? getFieldType(left, fieldName, entityName, registry) : 'unknown';
    const rightType = right ? getFieldType(right, fieldName, entityName, registry) : 'unknown';
    return `${leftType} & ${rightType}`;
  }
  case 'pipe': {
    // Zod v4 preprocess, transform, refinement, and effects types are all ZodEffects with
    // type 'pipe'
    // The 'out' property of the definition contains the output schema
    const pipeDef = schema.def as any;
    if (pipeDef.out) {
      return getFieldType(pipeDef.out, fieldName, entityName, registry);
    }
    return 'unknown';
  }
  default:
    return 'unknown';
  }
}

/**
 * Checks if a field is optional
 * @param schema - The Zod schema to check
 * @returns True if the field is optional, false otherwise
 * @internal
 */
function isFieldOptional(schema: z.ZodTypeAny): boolean {
  const { type } = schema.def;

  if (type === 'optional') {
    return true;
  }

  if (type === 'default') {
    return true;
  }

  if (type === 'lazy') {
    // For lazy types, check if the resolved schema is optional
    try {
      const lazySchema = schema as z.ZodLazy<any>;
      const resolvedSchema = lazySchema.unwrap();
      return isFieldOptional(resolvedSchema);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Gets validation rules for a field
 * @param schema - The Zod schema to extract validations from
 * @param registry - The Zod metadata registry for ID reference metadata
 * @returns Array of validation rule strings (e.g., ['min: 5', 'max: 100', 'email'])
 * @internal
 * @remarks
 * Supports extraction of validations from string, number, enum, and literal types.
 * Handles unwrapping of optional, nullable, default, and lazy schemas.
 * Also extracts ID reference metadata when present.
 */
function getFieldValidation(schema: z.ZodTypeAny, registry: $ZodRegistry<any>): string[] {
  const validations: string[] = [];
  const { type } = schema.def;

  // Handle wrapped types (optional, nullable, default, lazy)
  if (type === 'optional' || type === 'nullable' || type === 'default' || type === 'lazy') {
    const unwrappedSchema =
      type === 'optional'
        ? (schema as z.ZodOptional<any>).unwrap()
        : type === 'nullable'
          ? (schema as z.ZodNullable<any>).unwrap()
          : type === 'default'
            ? (schema as z.ZodDefault<any>).unwrap()
            : (schema as z.ZodLazy<any>).unwrap();
    return getFieldValidation(unwrappedSchema, registry);
  }

  // Handle wrapped types (pipe/preprocess/transform)
  if (type === 'pipe' && (schema as any).out) {
    return getFieldValidation((schema as any).out, registry);
  }

  // Handle arrays
  if (type === 'array') {
    const arraySchema = schema as z.ZodArray<any>;
    const elementSchema = arraySchema.element;
    return getFieldValidation(elementSchema, registry);
  }

  // Check for string validations
  if (type === 'string') {
    const def = schema.def as any;
    const checks = def.checks || [];

    // Check for ID reference metadata
    const meta = registry.get(schema);
    if (meta?.['targetEntityName']) {
      validations.push(`ref: ${meta['targetEntityName']}`);
    }

    // Check for format-based validations (new Zod 4.x top-level validators)
    if (def.format === 'email') {
      validations.push('email');
    }
    if (def.format === 'uuid') {
      validations.push('uuid');
    }
    if (def.format === 'url') {
      validations.push('url');
    }

    // Check for legacy checks array validations
    if (checks.some((check: any) => check.format === 'email')) {
      validations.push('email');
    }
    if (checks.some((check: any) => check.format === 'uuid')) {
      validations.push('uuid');
    }
    if (checks.some((check: any) => check.format === 'url')) {
      validations.push('url');
    }

    // Check for min/max length
    const minLengthCheck = checks.find(
      (check: any) => check.constructor.name === '$ZodCheckMinLength',
    );
    const maxLengthCheck = checks.find(
      (check: any) => check.constructor.name === '$ZodCheckMaxLength',
    );

    if (minLengthCheck) {
      validations.push(`min: ${minLengthCheck.value || 1}`);
    }
    if (maxLengthCheck) {
      validations.push(`max: ${maxLengthCheck.value || 100}`);
    }
  }

  // Check for number validations
  if (type === 'number') {
    const num = schema as ZodNumber;
    if (
      typeof num.minValue === 'number'
      && Number.isFinite(num.minValue)
      && num.minValue !== -Infinity
    ) {
      if (num.minValue === 0) {
        validations.push('positive');
      } else {
        validations.push(`min: ${num.minValue}`);
      }
    }
    if (typeof num.maxValue === 'number' && Number.isFinite(num.maxValue)) {
      validations.push(`max: ${num.maxValue}`);
    }
  }

  // Check for enum validations
  if (type === 'enum') {
    const enumValues = Object.keys((schema.def as any).entries);
    validations.push(`enum: ${enumValues.join(', ')}`);
  }

  // Non-discriminated union of literals -> enum values
  if (type === 'union' && !(schema.def as any).discriminator) {
    const unionDef = schema.def as any;
    const options: z.ZodTypeAny[] = (unionDef.options as z.ZodTypeAny[]) ?? [];
    const literalValues: string[] = [];
    let allLiterals = options.length > 0;
    for (const opt of options) {
      if (opt?.def?.type === 'literal') {
        const litDef = opt.def as any;
        const [value] = (litDef.values ?? []) as unknown[];
        literalValues.push(String(value));
      } else {
        allLiterals = false;
        break;
      }
    }
    if (allLiterals && literalValues.length) {
      validations.push(`enum: ${literalValues.join(', ')}`);
    }
  }

  // Check for literal validations
  if (type === 'literal') {
    const literalDef = schema.def as any;
    const [literalValue] = literalDef.values;
    if (typeof literalValue === 'string') {
      validations.push(`literal: ${literalValue}`);
    } else {
      validations.push(`literal: ${literalValue}`);
    }
  }

  return validations;
}

/**
 * Generates an Entity-Relationship diagram
 * @param entities - The parsed schema entities with fields and relationships
 * @param options - Diagram generation options including validation display settings
 * @returns A complete Mermaid ER diagram string
 * @internal
 * @remarks
 * Creates ER syntax with entity definitions, field types, validation annotations,
 * and relationship cardinality notation. Handles embedded objects, ID references,
 * self-referential relationships, and discriminated unions.
 */
function generateERDiagram(
  entities: SchemaEntity[],
  options: Required<Omit<MermaidOptions, 'metadataRegistry'>> & { metadataRegistry?: unknown },
): string {
  const lines: string[] = ['erDiagram'];

  // Add entity definitions
  for (const entity of entities) {
    // Skip empty placeholder entities in ER diagrams - they will still appear through relationships
    if (entity.fields.length === 0) {
      continue;
    }

    lines.push(`    ${entity.name} {`);

    for (const field of entity.fields) {
      let fieldType = field.type;
      const validation = field.validation || [];

      // Handle generic types (e.g., Record<K,V>, Map<K,V>, Set<T>, Promise<T>)
      const genericMatch = fieldType.match(/^([A-Za-z]+)<(.+)>$/);
      if (genericMatch && genericMatch[1] && genericMatch[2]) {
        const baseName = genericMatch[1] as string;
        const genericParams = genericMatch[2] as string;
        const escapedParams = genericParams.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        fieldType = baseName;
        validation.unshift(`&lt;${escapedParams}&gt;`);
      }

      // Handle tuple types in ER diagrams by annotating and simplifying the base type
      if (fieldType.startsWith('[') && fieldType.endsWith(']')) {
        const escaped = fieldType
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/&/g, '&amp;');
        validation.unshift(escaped);
        fieldType = 'Tuple';
      }

      // Handle non-discriminated unions by annotating the union string
      if (fieldType.includes(' | ')) {
        const escaped = fieldType
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/&/g, '&amp;');
        validation.unshift(escaped);
        fieldType = 'union';
      }

      // Handle intersections similarly
      if (fieldType.includes(' & ')) {
        const escaped = fieldType
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/&/g, '&amp;');
        validation.unshift(escaped);
        fieldType = 'intersection';
      }

      const parts: string[] = [];
      // Base field type and name
      const fieldLine = `        ${fieldType} ${field.name}`;
      parts.push(fieldLine);
      // Build annotations: description and validation
      const annotations: string[] = [];
      const desc = field.description?.trim();
      if (desc && desc !== fieldType) annotations.push(desc);
      if (options.includeValidation && validation?.length) annotations.push(...validation);
      const validationString = annotations.length ? ` "${annotations.join(', ')}"` : '';

      lines.push(`${fieldLine}${validationString}`);
    }

    lines.push('    }');
  }

  // Add relationships between entities
  for (const entity of entities) {
    for (const field of entity.fields) {
      // Check if this field references another entity (embedded relationship)
      const referencedEntity = entities.find(e => e.name === field.type);
      if (
        referencedEntity &&
        field.type !== 'string' &&
        field.type !== 'number' &&
        field.type !== 'boolean' &&
        field.type !== 'date' &&
        !field.type.endsWith('[]')
      ) {
        const relationshipType = field.isOptional ? '||--o{' : '||--||';
        lines.push(
          `    ${entity.name} ${relationshipType} ${referencedEntity.name} : "${field.name}"`,
        );
      } else if (
        // Handle ID references to entities
        field.isIdReference &&
        field.referencedEntity
      ) {
        // ID reference relationship - use different line styles for single vs array references
        let relationshipType: string;
        if (field.type.endsWith('[]')) {
          // Array of ID references - use "many-to-many" relationship
          relationshipType = '}o--o{';
        } else {
          // Single ID reference - use "many-to-one" relationship
          relationshipType = field.isOptional ? '}o--o{' : '}o--||';
        }
        const targetName = entities.find(e => e.name === field.referencedEntity)?.name
          ?? field.referencedEntity;
        lines.push(
          `    ${entity.name} ${relationshipType} ${targetName} : "${field.name}"`,
        );
      }

      // Handle self-referential relationships (arrays of the same entity type)
      if (field.type.endsWith('[]')) {
        const baseType = field.type.slice(0, -2); // Remove '[]'
        const referencedEntity = entities.find(e => e.name === baseType);
        if (referencedEntity && referencedEntity.name === entity.name) {
          // Self-referential relationship
          const relationshipType = field.isOptional ? '||--o{' : '||--||';
          lines.push(`    ${entity.name} ${relationshipType} ${entity.name} : "${field.name}"`);
        }
      }
    }
  }

  // Add union relationships for discriminated unions
  for (const entity of entities) {
    if (entity.unionRelationships) {
      const { baseEntity, subtypes } = entity.unionRelationships;
      for (const subtype of subtypes) {
        // Use discriminator value as the relationship label
        lines.push(
          `    ${baseEntity} ||--|| ${subtype.name} : "${subtype.discriminatorValue}"`,
        );
      }
    }
  }

  return lines.join('\n');
}

/**
 * Generates a Class diagram
 * @param entities - The parsed schema entities with fields and relationships
 * @returns A complete Mermaid class diagram string
 * @internal
 * @remarks
 * Creates UML-style class syntax with properties and associations.
 * Uses composition notation (*--) for embedded relationships and
 * reference arrows (-->) for ID references.
 */
function generateClassDiagram(entities: SchemaEntity[]): string {
  const lines: string[] = ['classDiagram'];

  // Add class definitions
  for (const entity of entities) {
    lines.push(`    class ${entity.name} {`);

    for (const field of entity.fields) {
      const visibility = field.isOptional ? '+' : '+';
      const base = `        ${visibility}${field.name}: ${field.type}`;
      const desc = field.description?.trim();
      const suffix = desc && desc !== field.type ? ` // ${desc}` : '';
      const fieldLine = `${base}${suffix}`;
      lines.push(fieldLine);
    }

    lines.push('    }');
  }

  // Add relationships between classes
  for (const entity of entities) {
    for (const field of entity.fields) {
      // Check if this field references another entity (embedded relationship)
      const referencedEntity = entities.find(e => e.name === field.type);
      if (
        referencedEntity &&
        field.type !== 'string' &&
        field.type !== 'number' &&
        field.type !== 'boolean' &&
        field.type !== 'date' &&
        !field.type.endsWith('[]')
      ) {
        // Use UML composition notation (diamond) for embedded relationships
        const relationshipType = field.isOptional ? '*--' : '*--';
        lines.push(
          `    ${entity.name} ${relationshipType} ${referencedEntity.name} : ${field.name}`,
        );
      } else if (
        // Handle ID references to entities
        field.isIdReference &&
        field.referencedEntity
      ) {
        // ID reference relationship - use a different arrow style for class diagrams
        // Class diagrams don't support dotted arrows with labels, so use a different approach
        const relationshipType = field.isOptional ? '-->' : '-->';
        lines.push(
          `    ${entity.name} ${relationshipType} ${field.referencedEntity} : ${field.name} (ref)`,
        );
      }

      // Handle self-referential relationships (arrays of the same entity type)
      if (field.type.endsWith('[]')) {
        const baseType = field.type.slice(0, -2); // Remove '[]'
        const referencedEntity = entities.find(e => e.name === baseType);
        if (referencedEntity && referencedEntity.name === entity.name) {
          // Self-referential relationship - use composition notation
          const relationshipType = field.isOptional ? '*--' : '*--';
          lines.push(`    ${entity.name} ${relationshipType} ${entity.name} : ${field.name}`);
        }
      }
    }
  }

  // Add union relationships for discriminated unions
  for (const entity of entities) {
    if (entity.unionRelationships) {
      const { baseEntity, subtypes } = entity.unionRelationships;
      for (const subtype of subtypes) {
        // Use discriminator value as the relationship label
        lines.push(`    ${baseEntity} <|-- ${subtype.name} : ${subtype.discriminatorValue}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Generates a Flowchart diagram
 * @param entities - The parsed schema entities with fields and relationships
 * @returns A complete Mermaid flowchart diagram string
 * @internal
 * @remarks
 * Creates a hierarchical flowchart showing entities, their fields, and relationships.
 * Uses solid arrows for embedded relationships and dotted arrows for ID references
 * and union subtypes.
 */
function generateFlowchartDiagram(entities: SchemaEntity[]): string {
  const lines: string[] = ['flowchart TD'];

  // Add all entity nodes first
  for (const entity of entities) {
    lines.push(`    ${entity.name}["${entity.name}"]`);
  }

  // Add field nodes and their connections to parent entities
  for (const entity of entities) {
    for (const field of entity.fields) {
      const desc = field.description?.trim();
      const label = desc && desc !== field.type
        ? `${field.name}: ${field.type}\\n${desc}`
        : `${field.name}: ${field.type}`;
      const fieldNode = `${entity.name}_${field.name}["${label}"]`;
      lines.push(`    ${fieldNode}`);
      lines.push(`    ${entity.name} --> ${fieldNode}`);

      // Add connection to referenced entity if this field references another entity
      const referencedEntity = entities.find(e => e.name === field.type);
      if (
        referencedEntity &&
        field.type !== 'string' &&
        field.type !== 'number' &&
        field.type !== 'boolean' &&
        field.type !== 'date' &&
        !field.type.endsWith('[]')
      ) {
        lines.push(`    ${fieldNode} --> ${referencedEntity.name}`);
      }

      // Handle ID references to entities
      if (field.isIdReference && field.referencedEntity) {
        lines.push(`    ${fieldNode} -.-> ${field.referencedEntity}`);
      }

      // Handle self-referential connections (arrays of the same entity type)
      if (field.type.endsWith('[]')) {
        const baseType = field.type.slice(0, -2); // Remove '[]'
        const referencedEntity = entities.find(e => e.name === baseType);
        if (referencedEntity && referencedEntity.name === entity.name) {
          // Self-referential connection
          lines.push(`    ${fieldNode} --> ${entity.name}`);
        }
      }
    }
  }

  // Add union relationships for discriminated unions
  for (const entity of entities) {
    if (entity.unionRelationships) {
      const { baseEntity, subtypes } = entity.unionRelationships;
      for (const subtype of subtypes) {
        // Flowcharts don't support labels on dotted lines, so just show the connection
        lines.push(`    ${baseEntity} -.-> ${subtype.name}`);
      }
    }
  }

  return lines.join('\n');
}
