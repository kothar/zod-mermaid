import { z } from 'zod';

import { idRef } from '../id-ref';
import { generateMermaidDiagram } from '../mermaid-generator';
import { validateMermaidSyntax } from './mermaid-validator';

describe('Schema identity ID references', () => {
  it.each(['er', 'class', 'flowchart'] as const)(
    'distinguishes identical labels in %s',
    async diagramType => {
      const first = z.object({ id: z.string() }).describe('Target');
      const second = z.object({ id: z.number() }).describe('Target');
      const root = z.object({ first: idRef(first), second: idRef(second) }).describe('Root');
      const diagram = generateMermaidDiagram([first, second, root], { diagramType });
      if (diagramType === 'er') {
        expect(diagram).toContain('Root }o--|| Target : "first"');
        expect(diagram).toContain('Root }o--|| Target_2 : "second"');
      } else if (diagramType === 'class') {
        expect(diagram).toContain('Root --> "1" Target_2 : second (ref)');
      } else {
        expect(diagram).toContain('Root_second -.-> Target_2');
      }
      await validateMermaidSyntax(diagram);
    },
  );

  it('deduplicates absent targets by identity without merging identical labels', () => {
    const first = z.object({ id: z.string() }).describe('Target');
    const second = z.object({ id: z.string() }).describe('Target');
    const root = z.object({ a: idRef(first), b: idRef(second), c: idRef(second) });
    const diagram = generateMermaidDiagram(root);
    expect(diagram).toContain('Entity }o--|| Target_2 : "b"');
    expect(diagram).toContain('Entity }o--|| Target_2 : "c"');
    expect(diagram.match(/Target_2\["Target"\] {/g)).toHaveLength(1);
  });

  it('resolves roots discovered later through wrappers, clones, and custom registries', () => {
    const target = z.object({ id: z.number() });
    const registry = z.registry<z.core.GlobalMeta>();
    registry.add(target, { entityName: 'Actual' });
    const root = z.object({
      ref: idRef(target, 'id', 'Alias').clone().describe('Reference').nullable().readonly(),
      refs: z.array(idRef(target)).optional(),
    });
    const diagram = generateMermaidDiagram([root, target], { metadataRegistry: registry });
    expect(diagram).toContain('Entity }o--o| Actual : "ref"');
    expect(diagram).toContain('Entity }o--o{ Actual : "refs"');
    expect(diagram).not.toContain('Alias {');
    expect(target.shape.id.meta()).toBeUndefined();
  });

  it('keeps legacy label-only metadata working', () => {
    const root = z.object({ ref: z.string().meta({ targetEntityName: 'Legacy' }) });
    expect(generateMermaidDiagram(root)).toContain('Entity }o--|| Legacy : "ref"');
  });
});
