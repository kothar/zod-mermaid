/** @module large-schema-benchmarks */
import { performance } from 'node:perf_hooks';

import { z } from 'zod';

import { generateMermaidDiagram } from '../src/mermaid-generator';

import type { DiagramType } from '../src/mermaid-types';

interface BenchmarkCase {
  readonly name: string;
  readonly size: number;
  readonly create: () => z.ZodType | z.ZodType[];
}

interface BenchmarkResult {
  readonly name: string;
  readonly size: number;
  readonly diagramType: DiagramType;
  readonly constructionMs: number;
  readonly medianMs: number;
  readonly p95Ms: number;
  readonly outputBytes: number;
  readonly heapDeltaBytes: number;
}

const DIAGRAM_TYPES: readonly DiagramType[] = ['er', 'class', 'flowchart'];
const ITERATIONS = Number(process.env['BENCH_ITERATIONS'] ?? 5);
if (!Number.isSafeInteger(ITERATIONS) || ITERATIONS < 1 || ITERATIONS > 100) {
  throw new Error('BENCH_ITERATIONS must be an integer from 1 to 100');
}

const cases: BenchmarkCase[] = [
  ...[1000, 10000, 50000].map(size => ({
    name: 'wide-object',
    size,
    create: () =>
      z.object(
        Object.fromEntries(
          Array.from({ length: size }, (_, index) => [`field_${index}`, z.string().min(1)]),
        ),
      ),
  })),
  ...[100, 1000, 5000].map(size => ({
    name: 'shared-entity-graph',
    size,
    create: () => {
      const shared = z.object({ id: z.string(), name: z.string() }).describe('Shared');
      return Array.from({ length: size }, (_, index) =>
        z
          .object({
            id: z.number(),
            shared,
            children: z.array(shared),
          })
          .describe(`Entity_${index}`),
      );
    },
  })),
  ...[100, 500, 1000].map(size => ({
    name: 'colliding-labels',
    size,
    create: () => Array.from({ length: size }, () => z.object({ id: z.string() }).describe('Same')),
  })),
  ...[10, 100, 500].map(size => ({
    name: 'recursive-collection-depth',
    size,
    create: () => {
      const node: z.ZodType = z.object({ children: z.lazy(() => children) }).describe('Node');
      let children: z.ZodType = node;
      for (let index = 0; index < size; index++) {
        children = index % 2 === 0 ? z.array(children) : z.set(children);
      }
      return node;
    },
  })),
];

const results: BenchmarkResult[] = [];
for (const benchmark of cases) {
  const constructionStart = performance.now();
  const schema = benchmark.create();
  const constructionMs = performance.now() - constructionStart;
  for (const diagramType of DIAGRAM_TYPES) {
    // Warm up before sampling; schema construction and Mermaid rendering are excluded.
    generateMermaidDiagram(schema, { diagramType });
    const times: number[] = [];
    let outputBytes = 0;
    let heapDeltaBytes = 0;
    for (let iteration = 0; iteration < ITERATIONS; iteration++) {
      global.gc?.();
      const heapBefore = process.memoryUsage().heapUsed;
      const start = performance.now();
      const output = generateMermaidDiagram(schema, { diagramType });
      times.push(performance.now() - start);
      outputBytes = Buffer.byteLength(output);
      heapDeltaBytes = Math.max(heapDeltaBytes, process.memoryUsage().heapUsed - heapBefore);
    }
    times.sort((left, right) => left - right);
    results.push({
      name: benchmark.name,
      size: benchmark.size,
      diagramType,
      constructionMs,
      medianMs: times[Math.floor(times.length / 2)] as number,
      p95Ms: times[Math.ceil(times.length * 0.95) - 1] as number,
      outputBytes,
      heapDeltaBytes,
    });
  }
}
process.stdout.write(
  `${JSON.stringify(
    {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      iterations: ITERATIONS,
      gcAvailable: typeof global.gc === 'function',
      results,
    },
    null,
    2,
  )}\n`,
);
