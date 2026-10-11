import { jest } from '@jest/globals';
import { z } from 'zod';

import { getEntityName } from '../entity';
import { DiagramGenerationError, SchemaParseError, ValidationError } from '../errors';
import { idRef } from '../id-ref';
import { generateMermaidDiagram } from '../mermaid-generator';
import { validateMermaidSyntax } from './mermaid-validator';

const DIAGRAM_TYPES = ['er', 'class', 'flowchart'] as const;

describe('Mermaid names and escaping', () => {
  it('actually rejects invalid syntax', async () => {
    await expect(validateMermaidSyntax('erDiagram\nThing { string first name }')).rejects.toThrow(
      'Invalid Mermaid syntax',
    );
  });

  it.each(DIAGRAM_TYPES)(
    'escapes names, annotations, and relationships in %s',
    async diagramType => {
      const target = z.object({ id: z.number() }).meta({ entityName: '1. User "account"' });
      const schema = z
        .object({
          'first name': z.string().describe('A "quoted"\nvalue <tag> & text'),
          'first-name': z.string(),
          first_name: z.string(),
          '': z.string(),
          '123': z.string(),
          'a.b': z.array(z.union([z.string(), z.number()])),
          用户: z.string(),
          PK: z.string(),
          'x"}\nInjected {': idRef(target).nullable(),
          'brackets[]': z.array(z.map(z.string(), z.tuple([z.number()]))),
        })
        .meta({ entityName: 'end' });
      const result = generateMermaidDiagram([schema, target], { diagramType });
      await validateMermaidSyntax(result);
      expect(result).toContain('Entity_end');
      expect(result).not.toContain('\nInjected {');
      if (diagramType === 'er') {
        expect(result).toContain('string first_name ');
        expect(result).toContain('string first_name_2 ');
        expect(result).toContain('string first_name_3');
        expect(result).toContain('&quot;quoted&quot;');
        expect(result).toContain('name: first name');
      }
    },
  );

  it.each(DIAGRAM_TYPES)('keeps normalized entity names distinct in %s', async diagramType => {
    const first = z.object({ name: z.string() }).describe('A-B');
    const second = z.object({ name: z.number() }).describe('A B');
    const schema = z.object({ first, second }).describe('Root');
    const result = generateMermaidDiagram([schema, first, second, schema], { diagramType });
    await validateMermaidSyntax(result);
    expect(result).toContain('A_B');
    expect(result).toContain('A_B_2');
    if (diagramType === 'er') {
      expect(result.match(/A_B\["A-B"\] {/g)).toHaveLength(1);
      expect(result).toContain('Root ||--|| A_B : "first"');
      expect(result).toContain('Root ||--|| A_B_2 : "second"');
    }
  });

  it('prevents flowchart field nodes from colliding with entity nodes', async () => {
    const result = generateMermaidDiagram(
      [
        z.object({ id: z.string() }).describe('User'),
        z.object({ value: z.string() }).describe('User_id'),
      ],
      { diagramType: 'flowchart' },
    );
    expect(result).toContain('User --> User_id_2');
    await validateMermaidSyntax(result);
  });

  it.each(DIAGRAM_TYPES)('handles punctuation and grammar keywords in %s', async diagramType => {
    for (const name of [
      'end',
      'direction TB',
      'class',
      'style',
      'title',
      'accTitle',
      'a:b;c',
      'a#quot;b',
      'a`b',
      'a\\b',
      'a[]b',
      'a|b',
      '',
      '用户',
      'a%%b',
    ]) {
      const child = z.object({ id: z.string() }).meta({ entityName: name });
      const schema = z.object({ [name]: child });
      await validateMermaidSyntax(generateMermaidDiagram(schema, { diagramType }));
    }
  });

  it('preserves original names when validation annotations are disabled', async () => {
    const result = generateMermaidDiagram(z.object({ 'display name': z.string().min(1) }), {
      includeValidation: false,
    });
    expect(result).toContain('name: display name');
    expect(result).not.toContain('min: 1');
    await validateMermaidSyntax(result);
  });
});

describe('Schema traversal and relationships', () => {
  it.each(DIAGRAM_TYPES)('handles mutual recursion and object arrays in %s', async diagramType => {
    const person: z.ZodType = z
      .object({
        name: z.string(),
        team: z.lazy(() => team).nullable(),
      })
      .describe('Person');
    const team: z.ZodType = z
      .object({
        people: z.array(person),
        parent: z.lazy(() => team).optional(),
      })
      .describe('Team');
    const result = generateMermaidDiagram([person, team], { diagramType });
    await validateMermaidSyntax(result);
    expect(result.length).toBeLessThan(2000);
    if (diagramType === 'er') {
      expect(result).toContain('Person ||--o| Team : "team"');
      expect(result).toContain('Team ||--o{ Person : "people"');
      expect(result).toContain('Team ||--o| Team : "parent"');
      expect(result.match(/Person {/g)).toHaveLength(1);
    }
  });

  it('handles unnamed recursive objects without inventing another entity', () => {
    const node: z.ZodType = z.object({ children: z.array(z.lazy(() => node)) });
    const result = generateMermaidDiagram(node, { entityName: 'Node' });
    expect(result).toContain('Node[] children');
    expect(result.match(/Node {/g)).toHaveLength(1);
  });

  it('omits optional fields and their otherwise unused nested entities', () => {
    const schema = z.object({
      absent: z.object({ name: z.string() }).optional().readonly(),
      defaulted: z.string().default('value'),
      prefaulted: z.string().prefault('value'),
      required: z.string().optional().nonoptional(),
      nullable: z.string().nullable(),
    });
    const result = generateMermaidDiagram(schema, { includeOptional: false });
    expect(result).not.toMatch(/absent|Absent|defaulted|prefaulted/);
    expect(result).toContain('string required');
    expect(result).toContain('string nullable');
  });

  it('recognizes optional unions, literals, intersections, and pipe inputs', () => {
    const schema = z.object({
      union: z.union([z.string(), z.undefined()]),
      literal: z.literal(undefined),
      intersection: z.intersection(z.string().optional(), z.string().optional()),
      pipe: z.string().optional().pipe(z.string().optional()),
      required: z.string().pipe(z.string()),
      requiredIntersection: z.intersection(z.string(), z.string().optional()),
    });
    const result = generateMermaidDiagram(schema, { includeOptional: false });
    expect(result.split('\n').filter(line => line.startsWith('        '))).toHaveLength(2);
    expect(result).toContain('string required');
    expect(result).toContain('requiredIntersection');
  });

  it.each(DIAGRAM_TYPES)('handles enum and multi-value discriminators in %s', async diagramType => {
    const schema = z
      .discriminatedUnion('kind', [
        z.object({ kind: z.enum(['a', 'b']), name: z.string() }),
        z.object({ kind: z.literal(['c', 'd']), child: z.object({ id: z.number() }) }),
      ])
      .describe('Choice');
    const result = generateMermaidDiagram(schema, { diagramType });
    expect(result).toContain('Choice_a__b');
    expect(result).toContain('Choice_c__d');
    await validateMermaidSyntax(result);
  });

  it('uses numeric and wrapped array ID references', async () => {
    const target = z.object({ id: z.number().int() }).describe('Target');
    const schema = z
      .object({
        ref: idRef(target).nullable().readonly(),
        refs: z.array(idRef(target)).optional().readonly(),
      })
      .describe('Source');
    const result = generateMermaidDiagram([schema, target]);
    expect(result).toContain('Source }o--o| Target : "ref"');
    expect(result).toContain('Source }o--o{ Target : "refs"');
    expect(result.match(/Target {/g)).toHaveLength(1);
    await validateMermaidSyntax(result);
  });

  it('uses a custom registry including metadata on wrappers', () => {
    const registry = z.registry<z.core.GlobalMeta>();
    const child = z.object({ value: z.string() }).readonly();
    registry.add(child, { entityName: 'Child label' });
    const root = z.object({ child });
    registry.add(root, { title: 'Root label' });
    const result = generateMermaidDiagram(root, { metadataRegistry: registry });
    expect(result).toContain('Root_label["Root label"]');
    expect(result).toContain('Child_label["Child label"]');
    expect(getEntityName(z.string(), registry, 'child')).toBe('Child');
  });

  it('propagates lazy errors and rejects wrapper cycles', () => {
    expect(() =>
      generateMermaidDiagram(
        z.lazy(() => {
          throw new Error('not ready');
        }),
      ),
    ).toThrow('not ready');
    const loop: z.ZodType = z.lazy(() => loop);
    expect(() => generateMermaidDiagram(loop)).toThrow(SchemaParseError);
    expect(() => generateMermaidDiagram(null as unknown as z.ZodType)).toThrow(SchemaParseError);
    expect(() => generateMermaidDiagram(z.string(), { diagramType: 'bad' as 'er' })).toThrow(
      DiagramGenerationError,
    );
    expect(new ValidationError('invalid', 'field').field).toBe('field');
  });
});

describe('Zod v4 types and validation', () => {
  const extended = z.object({
    anything: z.any(),
    unknown: z.unknown(),
    nothing: z.never(),
    void: z.void(),
    nan: z.nan(),
    file: z.file(),
    template: z.templateLiteral(['item-', z.number()]),
    caught: z.number().catch(0),
    readonly: z.string().readonly(),
    prefault: z.string().prefault('default'),
    required: z.string().optional().nonoptional(),
    literals: z.literal(['x', 42, null]),
    enum: z.enum({ One: 1, Two: 2 }),
    tuple: z.tuple([z.string()]).rest(z.number()),
    transform: z.string().transform(value => value.length),
    pipe: z.string().pipe(z.coerce.number()),
    custom: z.custom<{ value: string }>(),
  });

  it.each(DIAGRAM_TYPES)('renders expanded types in %s', async diagramType => {
    const result = generateMermaidDiagram(extended, { diagramType });
    await validateMermaidSyntax(result);
    if (diagramType === 'er') {
      for (const pair of [
        'any anything',
        'never nothing',
        'void void',
        'nan nan',
        'file file',
        'string template',
        'number caught',
        'string readonly',
        'string prefault',
        'string required',
        'number enum',
        'unknown transform',
        'number pipe',
      ]) {
        expect(result).toContain(pair);
      }
      expect(result).toContain('literal: x, 42, null');
      expect(result).toContain('enum: 1, 2');
    }
  });

  it.each(DIAGRAM_TYPES)('supports scalar and wrapped roots in %s', async diagramType => {
    for (const schema of [
      z.string(),
      z.object({ name: z.string() }).readonly(),
      z.array(z.object({ value: z.number() })),
      z.union([z.string(), z.number()]),
      z.intersection(z.object({ a: z.string() }), z.object({ b: z.number() })),
      z.json(),
    ]) {
      await validateMermaidSyntax(generateMermaidDiagram(schema, { diagramType }));
    }
  });

  it('extracts actual Zod checks, including zero and exclusive limits', async () => {
    const result = generateMermaidDiagram(
      z.object({
        text: z
          .string()
          .min(0)
          .max(12)
          .regex(/^[a-z]+$/),
        exact: z.string().length(3),
        email: z.string().email(),
        zero: z.number().nonnegative(),
        exclusive: z.number().gt(2).lt(10).multipleOf(2),
        items: z.array(z.string()).min(0).max(5),
        set: z.set(z.string()).min(1).max(4),
        exactSet: z.set(z.string()).size(2),
        native: z.enum({ A: 'value-a', B: 'value-b' }),
        literals: z.union([z.literal('a'), z.literal('b')]),
      }),
    );
    expect(result).toContain('min: 0, max: 12, regex: /^[a-z]+$/');
    expect(result).toContain('number zero "min: 0"');
    expect(result).toContain('gt: 2, lt: 10, multiple of: 2');
    expect(result).toContain('enum: value-a, value-b');
    expect(result).toContain('enum: a, b');
    await validateMermaidSyntax(result);
  });

  it('does not execute user callbacks while inspecting schemas', () => {
    const callback = jest.fn(() => 'value');
    const schema = z.object({
      default: z.string().default(callback),
      catch: z.string().catch(callback),
      preprocess: z.preprocess(callback, z.string()),
      transform: z.string().transform(callback),
      refine: z.string().refine(callback),
    });
    generateMermaidDiagram(schema);
    expect(callback).not.toHaveBeenCalled();
  });
});
