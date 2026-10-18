/** @module browser-rendering-checks */
import { readFile, realpath } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, resolve, sep } from 'node:path';

import { z } from 'zod';

import { idRef } from '../src/id-ref';
import { generateMermaidDiagram } from '../src/mermaid-generator';

const PORT = Number(process.env['RENDER_PORT'] ?? 4173);
if (!Number.isSafeInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('RENDER_PORT must be an integer from 1 to 65535');
}
const ROOT = resolve(__dirname, '..');
const MERMAID_ROOT = dirname(require.resolve('mermaid'));
const DIAGRAM_TYPES = ['er', 'class', 'flowchart'] as const;
const target = z.object({ id: z.number() }).describe('User account');
const recursive: z.ZodType = z
  .object({
    children: z.array(z.lazy(() => recursive)),
  })
  .describe('Tree');
const scenarios = [
  {
    name: 'escaped-labels',
    schema: z
      .object({
        'first name': z.string().describe('A "quoted" <tag> & value'),
        'first-name': z.string(),
        'x"}\nInjected {': z.string(),
        user: target,
      })
      .describe('Root "quoted"'),
    labels: ['Root "quoted"', 'User account'],
  },
  { name: 'recursive', schema: recursive, labels: ['Tree'] },
  {
    name: 'discriminated-union',
    schema: z
      .discriminatedUnion('kind', [
        z.object({ kind: z.literal('a'), value: z.string() }),
        z.object({ kind: z.literal('b'), value: z.number() }),
      ])
      .describe('Choice'),
    labels: ['Choice', 'Choice_a', 'Choice_b'],
  },
  {
    name: 'reference',
    schema: [z.object({ user: idRef(target).nullable() }).describe('Order'), target],
    labels: ['Order', 'User account'],
  },
];
const fixtures = scenarios.flatMap(scenario =>
  DIAGRAM_TYPES.map(diagramType => ({
    name: `${scenario.name}-${diagramType}`,
    source: generateMermaidDiagram(scenario.schema, { diagramType }),
    labels: scenario.labels,
  })),
);

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (request.method === 'GET' && pathname === '/') {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end(await readFile(resolve(ROOT, 'scripts/rendering-checks.html')));
    } else if (request.method === 'GET' && pathname === '/fixtures.json') {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(fixtures));
    } else if (request.method === 'GET' && pathname.startsWith('/mermaid/')) {
      const file = await realpath(resolve(MERMAID_ROOT, decodeURIComponent(pathname.slice(9))));
      if (!file.startsWith(`${MERMAID_ROOT}${sep}`) || !file.endsWith('.mjs')) {
        response.writeHead(404).end();
        return;
      }
      response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      response.end(await readFile(file));
    } else if (request.method === 'POST' && pathname === '/results') {
      let body = '';
      for await (const chunk of request) {
        body += String(chunk);
        if (Buffer.byteLength(body) > 65536) throw new Error('Rendering report is too large');
      }
      const report: unknown = JSON.parse(body);
      if (!Array.isArray(report) || report.length !== fixtures.length) {
        throw new Error('Incomplete rendering report');
      }
      const passed = report.every(
        (item: unknown, index) =>
          typeof item === 'object' &&
          item !== null &&
          'name' in item &&
          item.name === fixtures[index]?.name &&
          'passed' in item &&
          item.passed === true,
      );
      process.stdout.write(`${JSON.stringify({ passed, results: report }, null, 2)}\n`);
      response.writeHead(passed ? 200 : 422).end('Report received');
      if (process.env['RENDER_ONCE'] === '1') {
        process.exitCode = passed ? 0 : 1;
        server.close();
      }
    } else {
      response.writeHead(404).end();
    }
  } catch (error) {
    response.writeHead(500).end(error instanceof Error ? error.message : String(error));
  }
});
server.listen(PORT, '0.0.0.0', () => {
  process.stdout.write(
    `Open http://localhost:${PORT} to run ${fixtures.length} SVG rendering checks.\n`,
  );
});
