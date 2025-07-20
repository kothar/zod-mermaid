import type { z } from 'zod';

import type { MermaidOptions, SchemaEntity } from './mermaid-types';
import { DiagramGenerationError, SchemaParseError, ZodMermaidError } from './errors';

/**
 * Default options for Mermaid diagram generation
 */
const DEFAULT_OPTIONS: Required<MermaidOptions> = {
  diagramType: 'er',
  includeValidation: true,
  includeOptional: true,
  entityName: 'Entity',
  styling: {
    primaryColor: '#4CAF50',
    secondaryColor: '#2196F3',
  },
};

/**
 * Generates a Mermaid diagram from a Zod schema
 * @param schema - The Zod schema to convert to a diagram
 * @param options - Options for diagram generation
 * @returns A Mermaid diagram string
 * @throws {SchemaParseError} When schema parsing fails
 * @throws {DiagramGenerationError} When diagram generation fails
 */
export function generateMermaidDiagram(schema: z.ZodTypeAny, options: MermaidOptions = {}): string {
  try {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    const entities = parseSchemaToEntities(schema, mergedOptions);

    switch (mergedOptions.diagramType) {
    case 'er':
      return generateERDiagram(entities, mergedOptions);
    case 'class':
      return generateClassDiagram(entities);
    case 'flowchart':
      return generateFlowchartDiagram(entities);
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
  options: Required<MermaidOptions>,
  parentFieldName?: string,
): SchemaEntity[] {
  const entities: SchemaEntity[] = [];

  // Check if it's an object schema
  if (schema.def.type === 'object') {
    const objectSchema = schema as z.ZodObject<Record<string, z.ZodTypeAny>>;
    const { shape } = objectSchema;
    const entityName = getEntityName(schema, options, parentFieldName);

    const fields = Object.entries(shape).map(([key, value]) => {
      const fieldSchema = value as z.ZodTypeAny;
      const fieldType = getFieldType(fieldSchema, key, entityName);
      const isOptional = isFieldOptional(fieldSchema);
      const validation = getFieldValidation(fieldSchema);

      return {
        name: key,
        type: fieldType,
        isOptional,
        validation,
        description: undefined,
      };
    });

    entities.push({
      name: entityName,
      fields,
      description: undefined,
    });

    // Recursively parse nested objects and unions
    for (const [key, value] of Object.entries(shape)) {
      const fieldSchema = value as z.ZodTypeAny;
      if (fieldSchema.def.type === 'object') {
        const nestedEntities = parseSchemaToEntities(fieldSchema, options, key);
        entities.push(...nestedEntities);
      } else if (fieldSchema.def.type === 'union' && (fieldSchema.def as any).discriminator) {
        // Handle discriminated unions as nested fields
        const nestedEntities = parseSchemaToEntities(fieldSchema, options, key);
        entities.push(...nestedEntities);
      } else if (fieldSchema.def.type === 'lazy') {
        // Handle lazy types that might contain objects
        try {
          const lazySchema = fieldSchema as z.ZodLazy<any>;
          const resolvedSchema = lazySchema.unwrap();
          if (resolvedSchema.def.type === 'object') {
            const nestedEntities = parseSchemaToEntities(resolvedSchema, options, key);
            entities.push(...nestedEntities);
          } else if (resolvedSchema.def.type === 'union' && (resolvedSchema.def as any).discriminator) {
            // Handle discriminated unions in lazy types
            const nestedEntities = parseSchemaToEntities(resolvedSchema, options, key);
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
    const unionEntityName = getEntityName(schema, options, parentFieldName);

    // Extract discriminator values
    const discriminatorValues = unionOptions.map((opt: any) => {
      const optionDef = opt.def as any;
      return optionDef.shape[discriminator].def.values[0];
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
      description: undefined,
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
        const [discriminatorValue] = optionDef.shape[discriminator].def.values;
        
        // Use the schema description if available, otherwise fall back to the generic naming
        const optionEntityName = optionSchema.description || `${unionEntityName}_${discriminatorValue}`;

        // Create the option entity with all fields except the discriminator
        const optionFields = Object.entries(optionDef.shape)
          .filter(([key]) => key !== discriminator) // Exclude discriminator field
          .map(([key, value]) => {
            const fieldSchema = value as z.ZodTypeAny;
            const fieldType = getFieldType(fieldSchema, key, optionEntityName);
            const isOptional = isFieldOptional(fieldSchema);
            const validation = getFieldValidation(fieldSchema);

            return {
              name: key,
              type: fieldType,
              isOptional,
              validation,
              description: undefined,
            };
          });

        entities.push({
          name: optionEntityName,
          fields: optionFields,
          description: undefined,
        });

        // Add to union subtypes tracking with discriminator value
        unionSubtypes.push({ name: optionEntityName, discriminatorValue });

        // Recursively parse nested objects in the option
        for (const [key, value] of Object.entries(optionDef.shape)) {
          if (key === discriminator) continue; // Skip discriminator field

          const fieldSchema = value as z.ZodTypeAny;
          if (fieldSchema.def.type === 'object') {
            const nestedEntities = parseSchemaToEntities(fieldSchema, options, key);
            entities.push(...nestedEntities);
          } else if (fieldSchema.def.type === 'lazy') {
            // Handle lazy types that might contain objects
            try {
              const lazySchema = fieldSchema as z.ZodLazy<any>;
              const resolvedSchema = lazySchema.unwrap();
              if (resolvedSchema.def.type === 'object') {
                const nestedEntities = parseSchemaToEntities(resolvedSchema, options, key);
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

  return entities;
}

/**
 * Gets the entity name from a schema
 * @param schema - The Zod schema
 * @param options - The diagram options
 * @param parentFieldName - The name of the parent field (for nested objects)
 * @returns The entity name
 */
function getEntityName(
  schema: z.ZodTypeAny,
  options: Required<MermaidOptions>,
  parentFieldName?: string,
): string {
  // Try to get name from schema metadata or use a default
  if (schema.description) {
    return schema.description;
  }

  // For nested objects, use the parent field name to create a descriptive name
  if (parentFieldName) {
    return parentFieldName.charAt(0).toUpperCase() + parentFieldName.slice(1);
  }

  // For top-level entities, use the provided entityName option
  const schemaType = schema.constructor.name;
  if (schemaType.includes('Object') || schemaType.includes('ZodDiscriminatedUnion')) {
    return options.entityName;
  }

  return 'Schema';
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
 * @returns The field type as a string (e.g., 'string', 'number[]', 'Entity', etc.)
 *
 * @example
 * getFieldType(z.string(), 'name', 'User') // 'string'
 * getFieldType(z.array(z.number()), 'scores', 'User') // 'number[]'
 * getFieldType(z.object({...}), 'profile', 'User') // 'Profile'
 * getFieldType(z.lazy(() => UserSchema), 'parent', 'User') // 'User'
 */
function getFieldType(schema: z.ZodTypeAny, fieldName: string, entityName: string): string {
  const { type } = schema.def;

  switch (type) {
  case 'string':
    return 'string';
  case 'number':
    return 'number';
  case 'boolean':
    return 'boolean';
  case 'date':
    return 'date';
  case 'array': {
    const arraySchema = schema as z.ZodArray<any>;
    const arrayType = getFieldType(arraySchema.element, fieldName, entityName);
    return `${arrayType}[]`;
  }
  case 'object':
    // For objects, use the schema description if available, otherwise use field name
    if (schema.description) {
      return schema.description;
    }
    return fieldName ? fieldName.charAt(0).toUpperCase() + fieldName.slice(1) : 'Entity';
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
    const keyType = getFieldType(recordDef.keyType, fieldName, entityName);
    const valueType = getFieldType(recordDef.valueType, fieldName, entityName);
    return `Record<${keyType}, ${valueType}>`;
  }
  case 'optional': {
    const optionalSchema = schema as z.ZodOptional<any>;
    return getFieldType(optionalSchema.unwrap(), fieldName, entityName);
  }
  case 'nullable': {
    const nullableSchema = schema as z.ZodNullable<any>;
    return getFieldType(nullableSchema.unwrap(), fieldName, entityName);
  }
  case 'default': {
    const defaultSchema = schema as z.ZodDefault<any>;
    return getFieldType(defaultSchema.unwrap(), fieldName, entityName);
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
      return getFieldType(resolvedSchema, fieldName, entityName);
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
      if (schema.description) {
        return schema.description;
      }
      return fieldName ? fieldName.charAt(0).toUpperCase() + fieldName.slice(1) : 'Union';
    }
    // For regular unions, return a generic union type
    return 'union';
  }
  default:
    return 'unknown';
  }
}

/**
 * Checks if a field is optional
 * @param schema - The Zod schema
 * @returns True if the field is optional
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
 * @param schema - The Zod schema
 * @returns Array of validation rules
 */
function getFieldValidation(schema: z.ZodTypeAny): string[] {
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
    return getFieldValidation(unwrappedSchema);
  }

  // Check for string validations
  if (type === 'string') {
    const def = schema.def as any;
    const checks = def.checks || [];

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
    const checks = (schema.def as any).checks || [];

    // Check for positive validation
    if (
      checks.some(
        (check: any) => check.constructor.name === '$ZodCheckGreaterThan' && check.value === 0,
      )
    ) {
      validations.push('positive');
    }

    // Check for min/max values
    const minCheck = checks.find((check: any) => check.constructor.name === '$ZodCheckGreaterThan');
    const maxCheck = checks.find((check: any) => check.constructor.name === '$ZodCheckLessThan');

    if (minCheck && minCheck.value !== undefined && minCheck.value !== 0) {
      validations.push(`min: ${minCheck.value}`);
    }
    if (maxCheck && maxCheck.value !== undefined) {
      validations.push(`max: ${maxCheck.value}`);
    }
  }

  // Check for enum validations
  if (type === 'enum') {
    const enumValues = Object.keys((schema.def as any).entries);
    validations.push(`enum: ${enumValues.join(', ')}`);
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
 * @param entities - The schema entities
 * @param options - Diagram options
 * @returns ER diagram string
 */
function generateERDiagram(entities: SchemaEntity[], options: Required<MermaidOptions>): string {
  const lines: string[] = ['erDiagram'];

  // Add entity definitions
  for (const entity of entities) {
    lines.push(`    ${entity.name} {`);

    for (const field of entity.fields) {
      let fieldType = field.type;
      let validation = field.validation || [];

      // Handle record types specially for ER diagrams
      if (fieldType.startsWith('Record<') && fieldType.endsWith('>')) {
        // Extract the generic parameters and use HTML entities
        const genericParams = fieldType.slice(7, -1); // Remove 'Record<' and '>'
        const escapedParams = genericParams.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        fieldType = 'Record';
        validation = [`&lt;${escapedParams}&gt;`];
      }

      const fieldLine = `        ${fieldType} ${field.name}`;
      const validationString =
        options.includeValidation && validation?.length ? ` "${validation.join(', ')}"` : '';

      lines.push(`${fieldLine}${validationString}`);
    }

    lines.push('    }');
  }

  // Add relationships between entities
  for (const entity of entities) {
    for (const field of entity.fields) {
      // Check if this field references another entity
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
        lines.push(`    ${baseEntity} ||--|| ${subtype.name} : "${subtype.discriminatorValue}"`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Generates a Class diagram
 * @param entities - The schema entities
 * @param options - Diagram options
 * @returns Class diagram string
 */
function generateClassDiagram(entities: SchemaEntity[]): string {
  const lines: string[] = ['classDiagram'];

  // Add class definitions
  for (const entity of entities) {
    lines.push(`    class ${entity.name} {`);

    for (const field of entity.fields) {
      const visibility = field.isOptional ? '+' : '+';
      const fieldLine = `        ${visibility}${field.name}: ${field.type}`;
      lines.push(fieldLine);
    }

    lines.push('    }');
  }

  // Add relationships between classes
  for (const entity of entities) {
    for (const field of entity.fields) {
      // Check if this field references another entity
      const referencedEntity = entities.find(e => e.name === field.type);
      if (
        referencedEntity &&
        field.type !== 'string' &&
        field.type !== 'number' &&
        field.type !== 'boolean' &&
        field.type !== 'date' &&
        !field.type.endsWith('[]')
      ) {
        const relationshipType = field.isOptional ? '-->' : '-->';
        lines.push(
          `    ${entity.name} ${relationshipType} ${referencedEntity.name} : ${field.name}`,
        );
      }

      // Handle self-referential relationships (arrays of the same entity type)
      if (field.type.endsWith('[]')) {
        const baseType = field.type.slice(0, -2); // Remove '[]'
        const referencedEntity = entities.find(e => e.name === baseType);
        if (referencedEntity && referencedEntity.name === entity.name) {
          // Self-referential relationship
          const relationshipType = field.isOptional ? '-->' : '-->';
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
 * @param entities - The schema entities
 * @param options - Diagram options
 * @returns Flowchart string
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
      const fieldNode = `${entity.name}_${field.name}["${field.name}: ${field.type}"]`;
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
