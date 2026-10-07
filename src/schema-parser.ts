/** @module schema-parser */
import type { z } from 'zod';

import { getEntityName } from './entity';
import { SchemaParseError } from './errors';
import { allocateName } from './syntax';

import type { MermaidOptions, SchemaEntity, SchemaField } from './mermaid-types';

type Schema = z.core.$ZodType;

export interface ParsedField extends SchemaField {
  readonly targets: string[];
  readonly many: boolean;
  readonly isNullable: boolean;
}

export interface ParsedEntity extends SchemaEntity {
  readonly label: string;
  fields: ParsedField[];
}

function definition(schema: Schema): z.core.$ZodTypes['_zod']['def'] {
  return (schema as z.core.$ZodTypes)._zod.def;
}

/** Parse schemas without executing refinements, transforms, or default factories. */
export function parseSchemas(
  schemas: readonly z.ZodType[],
  options: Required<MermaidOptions>,
): ParsedEntity[] {
  const entities: ParsedEntity[] = [];
  const names = new Set<string>();
  const known = new Map<Schema, ParsedEntity>();
  const lazyCache = new Map<Schema, Schema>();
  const { metadataRegistry: registry } = options;

  function inner(schema: Schema): Schema | undefined {
    const def = definition(schema);
    switch (def.type) {
      case 'optional':
      case 'nullable':
      case 'default':
      case 'prefault':
      case 'catch':
      case 'readonly':
      case 'nonoptional':
        return def.innerType;
      case 'pipe':
        return def.out;
      case 'lazy': {
        let resolved = lazyCache.get(schema);
        if (!resolved) {
          resolved = def.getter();
          lazyCache.set(schema, resolved);
        }
        return resolved;
      }
      default:
        return undefined;
    }
  }

  function unwrap(schema: Schema): Schema[] {
    const chain: Schema[] = [];
    let current: Schema | undefined = schema;
    while (current) {
      if (chain.includes(current)) {
        throw new SchemaParseError('Circular schema wrappers cannot be resolved', schema);
      }
      chain.push(current);
      current = inner(current);
    }
    return chain;
  }

  function metadata(chain: readonly Schema[], key: string): string | undefined {
    for (const schema of chain) {
      const value = registry.get(schema)?.[key];
      if (typeof value === 'string' && value.length > 0) return value;
    }
    return undefined;
  }

  function optional(chain: readonly Schema[], seen = new Set<Schema>()): boolean {
    for (const schema of chain) {
      if (seen.has(schema)) return false;
      seen.add(schema);
      const def = definition(schema);
      if (def.type === 'nonoptional') return false;
      if (
        ['optional', 'default', 'prefault', 'undefined', 'void', 'any', 'unknown'].includes(
          def.type,
        )
      )
        return true;
      if (def.type === 'pipe') return optional(unwrap(def.in), seen);
      if (def.type === 'literal') return def.values.includes(undefined);
      if (def.type === 'union') {
        return def.options.some(option => optional(unwrap(option), new Set(seen)));
      }
      if (def.type === 'intersection') {
        return (
          optional(unwrap(def.left), new Set(seen)) && optional(unwrap(def.right), new Set(seen))
        );
      }
    }
    return false;
  }

  function field(schema: Schema, name: string): ParsedField {
    const chain = unwrap(schema);
    const base = chain[chain.length - 1] as Schema;
    const def = definition(base);
    const targets: string[] = [];
    const type = readType(schema, name, targets, new Set());
    const referenceChain = def.type === 'array' ? [...chain, ...unwrap(def.element)] : chain;
    const target = metadata(referenceChain, 'targetEntityName');
    const validation = chain.flatMap(item => validations(item));
    if (target) validation.unshift(`ref: ${target}`);
    if (chain.some(item => definition(item).type === 'nullable')) validation.push('nullable');
    return {
      name,
      type,
      isOptional: optional(chain),
      isNullable: chain.some(item => definition(item).type === 'nullable'),
      validation: [...new Set(validation)],
      description: metadata(chain, 'description'),
      targets,
      many: ['array', 'set', 'record', 'map'].includes(def.type),
      isIdReference: Boolean(target),
      referencedEntity: target,
    };
  }

  function entity(schema: Schema, fallback: string, omit?: string): ParsedEntity {
    const chain = unwrap(schema);
    const base = chain[chain.length - 1] as Schema;
    const existing = known.get(base);
    if (existing) return existing;
    const label =
      chain.map(item => getEntityName(item, registry)).find(Boolean) ||
      fallback ||
      options.entityName;
    const result: ParsedEntity = { name: allocateName(label, names), label, fields: [] };
    known.set(base, result);
    entities.push(result);
    const def = definition(base);
    if (def.type === 'object') {
      for (const [key, value] of Object.entries(def.shape)) {
        if (key === omit || (!options.includeOptional && optional(unwrap(value)))) continue;
        result.fields.push(field(value, key));
      }
    } else if (
      def.type === 'union' &&
      'discriminator' in def &&
      typeof def.discriminator === 'string'
    ) {
      const { discriminator } = def;
      const subtypes: Array<{ name: string; discriminatorValue: string }> = [];
      const values: string[] = [];
      for (const option of def.options) {
        const optionDef = definition(option);
        if (optionDef.type !== 'object') continue;
        const discriminatorSchema = optionDef.shape[discriminator];
        const discDef = discriminatorSchema ? definition(discriminatorSchema) : undefined;
        const literals =
          discDef?.type === 'literal'
            ? discDef.values
            : discDef?.type === 'enum'
              ? [...(discriminatorSchema as z.core.$ZodEnum)._zod.values]
              : [];
        const value = literals.map(String).join(', ');
        values.push(...literals.map(String));
        const subtype = entity(option, `${label}_${value}`, discriminator);
        subtypes.push({ name: subtype.name, discriminatorValue: value });
      }
      result.fields.push({
        name: discriminator,
        type: 'string',
        isOptional: false,
        isNullable: false,
        validation: [`enum: ${values.join(', ')}`],
        targets: [],
        many: false,
      });
      result.unionRelationships = { baseEntity: result.name, subtypes };
    } else {
      result.fields.push(field(base, 'value'));
    }
    return result;
  }

  function readType(schema: Schema, name: string, targets: string[], active: Set<Schema>): string {
    if (active.has(schema)) return known.get(schema)?.name ?? 'unknown';
    const chain = unwrap(schema);
    const base = chain[chain.length - 1] as Schema;
    const def = definition(base);
    if (def.type === 'object' || (def.type === 'union' && 'discriminator' in def)) {
      const result = entity(schema, name.charAt(0).toUpperCase() + name.slice(1));
      targets.push(result.name);
      return result.name;
    }
    active.add(schema);
    const read = (child: Schema) => readType(child, name, targets, active);
    let result: string;
    switch (def.type) {
      case 'function': {
        // Argument and return objects are types, not owned fields of the enclosing entity.
        const input = readType(def.input, `${name}Args`, [], active);
        const output = readType(def.output, `${name}Result`, [], active);
        result = `Function<${input}, ${output}>`;
        break;
      }
      case 'array': {
        const element = read(def.element);
        result = / [|&] /.test(element) ? `(${element})[]` : `${element}[]`;
        break;
      }
      case 'record':
      case 'map':
        result = `${def.type === 'map' ? 'Map' : 'Record'}<${read(def.keyType)}, ${read(def.valueType)}>`;
        break;
      case 'set':
        result = `Set<${read(def.valueType)}>`;
        break;
      case 'promise':
        result = `Promise<${read(def.innerType)}>`;
        break;
      case 'tuple': {
        const items = def.items.map(read);
        if (def.rest) items.push(`...${read(def.rest)}[]`);
        result = `[${items.join(', ')}]`;
        break;
      }
      case 'union':
        result = [...new Set(def.options.map(read))].join(' | ');
        break;
      case 'intersection':
        result = `${read(def.left)} & ${read(def.right)}`;
        break;
      case 'enum': {
        const { values } = (base as z.core.$ZodEnum)._zod;
        result = [...new Set([...values].map(value => typeof value))].join(' | ');
        break;
      }
      case 'literal':
        result = [
          ...new Set(def.values.map(value => (value === null ? 'null' : typeof value))),
        ].join(' | ');
        break;
      case 'template_literal':
        result = 'string';
        break;
      case 'success':
        result = 'boolean';
        break;
      case 'transform':
      case 'custom':
        result = 'unknown';
        break;
      default:
        result = def.type;
    }
    active.delete(schema);
    return result;
  }

  // Share schema identity across roots and nested objects.
  for (const schema of schemas) {
    if (!schema || typeof schema !== 'object' || !('_zod' in schema)) {
      throw new SchemaParseError('Expected a Zod v4 schema', schema);
    }
    entity(schema, options.entityName);
  }
  for (const item of [...entities]) {
    for (const member of item.fields) {
      if (!member.referencedEntity) continue;
      const label = member.referencedEntity;
      let target = entities.find(candidate => candidate.label === label);
      if (!target) {
        target = { name: allocateName(label, names), label, fields: [] };
        entities.push(target);
      }
      member.referencedEntity = target.name;
    }
  }
  return entities;
}

function validations(schema: Schema): string[] {
  const def = definition(schema);
  const result: string[] = [];
  if (def.type === 'enum') {
    result.push(`enum: ${[...(schema as z.core.$ZodEnum)._zod.values].join(', ')}`);
  }
  if (def.type === 'literal') result.push(`literal: ${def.values.map(String).join(', ')}`);
  if (def.type === 'union') {
    const literals = def.options.map(definition);
    if (literals.every(item => item.type === 'literal')) {
      result.push(`enum: ${literals.flatMap(item => item.values).join(', ')}`);
    }
  }
  if ('format' in def && typeof def.format === 'string') result.push(def.format);
  for (const check of def.checks ?? []) {
    const rule = (check as z.core.$ZodChecks)._zod.def;
    switch (rule.check) {
      case 'min_length':
        result.push(`min: ${rule.minimum}`);
        break;
      case 'max_length':
        result.push(`max: ${rule.maximum}`);
        break;
      case 'length_equals':
        result.push(`length: ${rule.length}`);
        break;
      case 'min_size':
        result.push(`min size: ${rule.minimum}`);
        break;
      case 'max_size':
        result.push(`max size: ${rule.maximum}`);
        break;
      case 'size_equals':
        result.push(`size: ${rule.size}`);
        break;
      case 'greater_than':
        result.push(
          rule.value === 0 && !rule.inclusive
            ? 'positive'
            : `${rule.inclusive ? 'min' : 'gt'}: ${rule.value}`,
        );
        break;
      case 'less_than':
        result.push(`${rule.inclusive ? 'max' : 'lt'}: ${rule.value}`);
        break;
      case 'multiple_of':
        result.push(`multiple of: ${rule.value}`);
        break;
      case 'number_format':
        result.push(rule.format);
        break;
      case 'string_format':
        result.push(rule.format === 'regex' ? `regex: ${rule.pattern}` : rule.format);
        break;
      default:
        break;
    }
  }
  return result;
}
