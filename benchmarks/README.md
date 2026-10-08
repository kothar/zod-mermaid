# Large-schema benchmarks

Run `npm run benchmark` (Node 18.19+). To save only the JSON report, run:

```sh
node --expose-gc --import tsx benchmarks/large-schemas.ts > benchmark-results.json
```

`BENCH_ITERATIONS=10 npm run benchmark` changes the number of measured samples
(default 5, range 1–100). Each case constructs its schemas once, warms each diagram
format once, then measures generation with a monotonic clock. Construction time is
reported separately. These benchmarks measure library traversal and source generation;
Mermaid parsing, layout, and SVG rendering are excluded.

Cases cover 1,000–50,000 fields in a single object, 100–5,000 roots sharing a nested
entity, 100–1,000 schemas with colliding labels, and recursive nodes behind 10–500
alternating array/set layers. All three diagram formats are measured.

The report includes median/p95 generation time, UTF-8 output bytes, and the largest
observed before/after heap delta. GC runs before each sample when `--expose-gc` is
available. The heap delta is an allocation indicator, **not peak memory usage**;
collection during a sample and retained strings affect it. Compare reports on the
same Node version and machine. The report records Node/platform/architecture and
whether explicit GC was available. No timing thresholds run in CI because shared
runner load makes them unreliable.

Use increasing sizes to spot scaling changes. Colliding names deliberately exercise
identifier allocation, while shared graphs check that entities are deduplicated.
Recursive depth tests stack usage without creating an infinite entity graph. A
failed generation exits nonzero rather than silently omitting a benchmark case.
