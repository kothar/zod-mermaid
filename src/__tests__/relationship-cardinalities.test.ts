import { z } from 'zod';

import { idRef } from '../id-ref';
import { generateMermaidDiagram } from '../mermaid-generator';
import { validateMermaidSyntax } from './mermaid-validator';

const A = z.object({ id: z.string() }).describe('A');
const B = z.object({ id: z.number() }).describe('B');

describe('Per-target relationship cardinalities', () => {
  it.each([
    ['choice', z.union([A, B]), 'o|', 'o|'],
    ['mixed', z.union([A, z.array(B)]), 'o|', 'o{'],
    ['nullable', z.union([A, z.null()]), 'o|', undefined],
    ['nonempty', z.array(A).min(1), '|{', undefined],
    ['optional', z.array(A).min(1).optional(), 'o{', undefined],
    ['nullableItems', z.array(A.nullable()).min(1), 'o{', undefined],
    ['nested', z.array(z.array(A).min(1)).min(1), '|{', undefined],
    ['bounded', z.array(A).max(1), 'o|', undefined],
    ['exact', z.array(A).length(1), '||', undefined],
    ['empty', z.array(A).length(0), undefined, undefined],
    ['set', z.set(A).min(1), '|{', undefined],
    ['map', z.map(A, B), 'o{', 'o{'],
    ['record', z.record(z.string(), A), 'o{', undefined],
    ['tuple', z.tuple([A, B]), '||', '||'],
    ['repeated', z.tuple([A, A]), '|{', undefined],
    ['rest', z.tuple([A]).rest(B), '||', 'o{'],
    ['intersection', z.intersection(A, B), '||', '||'],
    ['promise', z.promise(A), '||', undefined],
  ] as const)('%s preserves each target bound', async (name, schema, a, b) => {
    const diagram = generateMermaidDiagram(z.object({ [name]: schema }).describe('Root'));
    for (const [target, bound] of [
      ['A', a],
      ['B', b],
    ]) {
      if (bound) expect(diagram).toContain(`Root ||--${bound} ${target} : "${name}"`);
      else expect(diagram).not.toMatch(new RegExp(`Root .* ${target} :`));
    }
    await validateMermaidSyntax(diagram);
  });

  it.each(['er', 'class', 'flowchart'] as const)(
    'resolves mixed reference targets in %s',
    async diagramType => {
      const schema = z
        .object({
          choice: z.union([idRef(A), z.array(idRef(B)).min(1)]),
          refs: z.set(idRef(A)).min(1),
        })
        .describe('Root');
      const diagram = generateMermaidDiagram([schema, A, B], { diagramType });
      if (diagramType === 'er') {
        expect(diagram).toContain('Root }o--o| A : "choice"');
        expect(diagram).toContain('Root }o--o{ B : "choice"');
        expect(diagram).toContain('Root }o--|{ A : "refs"');
      } else if (diagramType === 'class') {
        expect(diagram).toContain('Root --> "0..1" A : choice (ref)');
        expect(diagram).toContain('Root --> "0..*" B : choice (ref)');
        expect(diagram).toContain('Root --> "1..*" A : refs (ref)');
      } else {
        expect(diagram).toContain('Root_choice -.-> A');
        expect(diagram).toContain('Root_choice -.-> B');
      }
      await validateMermaidSyntax(diagram);
    },
  );

  it('merges repeated alternatives without losing a required common target', () => {
    const diagram = generateMermaidDiagram(z.object({ value: z.union([A, z.array(A).min(1)]) }));
    expect(diagram).toContain('Entity ||--|{ A : "value"');
  });
});
