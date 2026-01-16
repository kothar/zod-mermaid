import { z } from 'zod';

import { generateMermaidDiagram } from '../mermaid-generator';
import { validateMermaidSyntax } from './mermaid-validator';

describe('Additional Zod types rendering', () => {
  const AdditionalTypesSchema = z.object({
    big: z.bigint(),
    sym: z.symbol(),
    nul: z.null(),
    und: z.undefined(),
    tup: z.tuple([z.string(), z.number(), z.boolean()]),
    map: z.map(z.string(), z.number()),
    set: z.set(z.string()),
    prom: z.promise(z.number()),
    rec: z.record(z.string(), z.number()),
    inter: z.string().and(z.number()),
    union: z.union([z.string(), z.number()]),
    key: z.keyof(z.object({ foo: z.string(), bar: z.number() })),
  }).describe('AdditionalTypes');

  it('should render additional types in class diagram', async () => {
    const classDiagram = generateMermaidDiagram(AdditionalTypesSchema, { diagramType: 'class' });

    expect(classDiagram).toContain('classDiagram');
    expect(classDiagram).toContain('class AdditionalTypes');

    // Primitive-like additions
    expect(classDiagram).toContain('+big: bigint');
    expect(classDiagram).toContain('+sym: symbol');
    expect(classDiagram).toContain('+nul: null');
    expect(classDiagram).toContain('+und: undefined');

    // Composite/generic types
    expect(classDiagram).toContain('+tup: [string, number, boolean]');
    expect(classDiagram).toContain('+map: Map<string, number>');
    expect(classDiagram).toContain('+set: Set<string>');
    expect(classDiagram).toContain('+prom: Promise<number>');
    expect(classDiagram).toContain('+rec: Record<string, number>');

    // Operators/types
    expect(classDiagram).toContain('+inter: string & number');
    expect(classDiagram).toContain('+union: string | number');

    await validateMermaidSyntax(classDiagram);
  });

  it('should render generics and enum annotations in ER diagram', () => {
    const erDiagram = generateMermaidDiagram(AdditionalTypesSchema, { diagramType: 'er' });

    expect(erDiagram).toContain('erDiagram');

    // Simple types
    expect(erDiagram).toContain('bigint big');
    expect(erDiagram).toContain('symbol sym');
    expect(erDiagram).toContain('null nul');
    expect(erDiagram).toContain('undefined und');

    // Generic parameter escaping to annotations
    expect(erDiagram).toContain('Map map "&lt;string, number&gt;"');
    expect(erDiagram).toContain('Set set "&lt;string&gt;"');
    expect(erDiagram).toContain('Promise prom "&lt;number&gt;"');
    expect(erDiagram).toContain('Record rec "&lt;string, number&gt;"');

    // keyof renders as string; validation specifics may vary by Zod version
    expect(erDiagram).toContain('string key');
  });
});
