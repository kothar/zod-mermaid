/** @module mermaid-generator */
import { z } from 'zod';

import { DiagramGenerationError, SchemaParseError, ZodMermaidError } from './errors';
import { parseSchemas } from './schema-parser';
import { allocateName, escapeClassRelationship, escapeLabel } from './syntax';

import type { MermaidOptions } from './mermaid-types';
import type { ParsedEntity, ParsedRelationship } from './schema-parser';

/**
 * Generate an ER, class, or flowchart diagram from Zod v4 schemas.
 * @param schema - One schema or an array of schemas sharing a diagram.
 * @param options - Naming, metadata, and display options.
 * @returns Mermaid source with escaped labels and unique identifiers.
 * @throws {SchemaParseError} If a schema cannot be inspected.
 * @throws {DiagramGenerationError} If the diagram type is unsupported.
 * @example generateMermaidDiagram(z.object({ name: z.string() }), { entityName: 'User' });
 */
export function generateMermaidDiagram(
  schema: z.ZodTypeAny | z.ZodTypeAny[],
  options: MermaidOptions = {},
): string {
  try {
    const resolved: Required<MermaidOptions> = {
      diagramType: options.diagramType ?? 'er',
      includeValidation: options.includeValidation ?? true,
      includeOptional: options.includeOptional ?? true,
      entityName: options.entityName || 'Entity',
      metadataRegistry: options.metadataRegistry ?? z.globalRegistry,
    };
    if (!['er', 'class', 'flowchart'].includes(resolved.diagramType)) {
      throw new DiagramGenerationError('Unsupported diagram type', resolved.diagramType);
    }
    const entities = parseSchemas(Array.isArray(schema) ? schema : [schema], resolved);
    return render(entities, resolved);
  } catch (error) {
    if (error instanceof ZodMermaidError) throw error;
    throw new SchemaParseError(
      `Failed to generate diagram: ${error instanceof Error ? error.message : String(error)}`,
      schema,
    );
  }
}

function erType(type: string): { type: string; annotation?: string } {
  if (/^[A-Za-z][A-Za-z0-9_]*(\[\])*$/.test(type)) return { type };
  const generic = /^([A-Za-z]+)<(.*)>$/.exec(type);
  if (generic) return { type: generic[1] as string, annotation: `<${generic[2]}>` };
  const base = type.startsWith('[')
    ? 'Tuple'
    : type.includes(' | ')
      ? 'union'
      : type.includes(' & ')
        ? 'intersection'
        : 'unknown';
  return { type: base, annotation: type };
}

function cardinality(relation: ParsedRelationship): string {
  const target =
    relation.max > 1 ? (relation.min > 0 ? '|{' : 'o{') : relation.min > 0 ? '||' : 'o|';
  return `${relation.isIdReference ? '}o' : '||'}--${target}`;
}

function render(entities: ParsedEntity[], options: Required<MermaidOptions>): string {
  const { diagramType } = options;
  const lines = [
    diagramType === 'er' ? 'erDiagram' : diagramType === 'class' ? 'classDiagram' : 'flowchart TD',
  ];
  const nodeNames = new Set(entities.map(entity => entity.name));
  for (const entity of entities) {
    const { name, label } = entity;
    if (diagramType === 'flowchart') {
      lines.push(`    ${name}["${escapeLabel(label)}"]`);
    } else {
      const alias = label === name ? '' : `["${escapeLabel(label)}"]`;
      const declaration = diagramType === 'class' ? `class ${name}${alias}` : `${name}${alias}`;
      lines.push(`    ${declaration} {`);
    }
    const fieldNames = new Set<string>();
    for (const field of entity.fields) {
      const fieldName = allocateName(field.name, fieldNames, true);
      if (diagramType === 'er') {
        const type = erType(field.type);
        const annotations = [
          ...(type.annotation ? [type.annotation] : []),
          ...(fieldName !== field.name ? [`name: ${field.name}`] : []),
          ...(field.description ? [field.description] : []),
          ...(options.includeValidation ? (field.validation ?? []) : []),
        ];
        const comment = annotations.length ? ` "${escapeLabel(annotations.join(', '))}"` : '';
        lines.push(`        ${type.type} ${fieldName}${comment}`);
      } else if (diagramType === 'class') {
        lines.push(`        +${fieldName}: ${escapeLabel(field.type)}`);
      } else {
        const node = allocateName(`${name}_${field.name}`, nodeNames);
        const description = field.description ? ` — ${field.description}` : '';
        lines.push(`    ${node}["${escapeLabel(`${field.name}: ${field.type}${description}`)}"]`);
        lines.push(`    ${name} --> ${node}`);
        for (const relation of field.relationships) {
          lines.push(`    ${node} ${relation.isIdReference ? '-.->' : '-->'} ${relation.target}`);
        }
      }
    }
    if (diagramType !== 'flowchart') lines.push('    }');
  }
  for (const entity of entities) {
    if (diagramType !== 'flowchart') {
      for (const field of entity.fields) {
        for (const relation of field.relationships) {
          const { target } = relation;
          if (diagramType === 'er') {
            lines.push(
              `    ${entity.name} ${cardinality(relation)} ${target} : "${escapeLabel(field.name)}"`,
            );
          } else {
            const arrow = relation.isIdReference ? '-->' : '*--';
            const multiplicity =
              relation.max > 1
                ? relation.min > 0
                  ? '1..*'
                  : '0..*'
                : relation.min > 0
                  ? '1'
                  : '0..1';
            lines.push(
              `    ${entity.name} ${arrow} "${multiplicity}" ${target} : ${escapeClassRelationship(field.name)}${relation.isIdReference ? ' (ref)' : ''}`,
            );
          }
        }
      }
    }
    for (const subtype of entity.unionRelationships?.subtypes ?? []) {
      if (diagramType === 'er') {
        lines.push(
          `    ${entity.name} ||--|| ${subtype.name} : "${escapeLabel(subtype.discriminatorValue)}"`,
        );
      } else if (diagramType === 'class') {
        lines.push(
          `    ${entity.name} <|-- ${subtype.name} : ${escapeClassRelationship(subtype.discriminatorValue)}`,
        );
      } else {
        lines.push(`    ${entity.name} -.-> ${subtype.name}`);
      }
    }
  }
  return lines.join('\n');
}
