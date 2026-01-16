# Scripts Directory

This directory contains utility scripts for maintaining the zod-mermaid project.

## schema-utils.ts

Shared utility functions for extracting and executing Zod schema code from markdown files.

### Exports

- **`extractSchemaCode(content, marker)`** - Extracts TypeScript code from `<!-- SCHEMA: marker -->` markers
- **`executeSchemaCode(code, sharedContext)`** - Executes schema code in a sandboxed context with Zod/idRef imports
- **`extractVariableNames(code)`** - Extracts variable names from TypeScript code
- **`replaceDiagramByMarker(content, marker, diagram)`** - Replaces diagram content between `<!-- DIAGRAM: marker -->` markers

These utilities are used by both `regenerate-readme.ts` and can be used by other scripts that need to work with schema definitions in markdown.

## regenerate-readme.ts

A TypeScript script that regenerates all Mermaid diagrams in the main README.md file.

### Purpose

This script ensures that the diagrams shown in the README always reflect the current output of the library. When changes are made to the diagram generation logic, running this script will update all example diagrams to match the new output.

### How It Works

1. **Extracts** Zod schema code from `<!-- SCHEMA: ... -->` markers in README.md
2. **Executes** the extracted schema code to create actual Zod schema objects
3. **Generates** fresh Mermaid diagrams using the current library code
4. **Replaces** only the diagram sections in README.md with the new output

### No Duplication!

The schema code in the README is the **single source of truth**. The script:
- Reads schema definitions directly from the README TypeScript code blocks
- Dynamically executes them to generate diagrams
- Updates only the diagram output, not the schema code

This means you only need to update schemas in one place (the README), and the script will automatically regenerate all diagrams based on those definitions

### Usage

```bash
# Run via npm script (recommended)
npm run regenerate:readme

# Or run directly with tsx
npx tsx scripts/regenerate-readme.ts
```

### Diagrams Updated

The script updates the following diagram sections in README.md:

- Product ER Diagram (Entity-Relationship example)
- User Class Diagram (Class diagram example)
- User Flowchart Diagram (Flowchart example)
- Directory ER Diagram (Self-referential example)
- Nested User ER Diagram (Nested objects example)
- Event ER Diagram (Discriminated union ER example)
- Event Class Diagram (Discriminated union class example)
- Order ER Diagram (ID references ER example)
- Order Class Diagram (ID references class example)

## regenerate-examples.ts

A TypeScript script that regenerates all Mermaid diagrams in `examples/mermaid-examples.md`.

### Purpose

This script generates comprehensive examples showing all diagram types and features of the library.

### How It Works

1. **Defines** all example Zod schemas inline (User, Product, Directory, Events, etc.)
2. **Generates** diagrams for each schema in multiple formats (ER, Class, Flowchart)
3. **Writes** the complete examples markdown file from scratch

### Usage

```bash
# Run via npm script (recommended)
npm run regenerate:examples

# Or run directly with tsx
npx tsx scripts/regenerate-examples.ts
```

### Note

Unlike `regenerate-readme.ts`, this script doesn't extract schemas from the markdown file. Instead, it defines all schemas inline and generates the complete file. This is because the examples file is meant to be a comprehensive showcase of all features, not documentation with editable schema examples.

## Related Scripts

- **regenerate:readme** - Regenerates diagrams in README.md (extracts schemas from README)
- **regenerate:examples** - Regenerates diagrams in examples/mermaid-examples.md (defines schemas inline)
- **regenerate:all** - Regenerates all diagrams in both README and examples

## Maintenance

If you add new diagram examples to the README:

1. **Add schema markers** around your TypeScript code block in README.md:
   ```markdown
   <!-- SCHEMA: my-example START -->
   ```typescript
   const MySchema = z.object({ ... });
   ```
   <!-- SCHEMA: my-example END -->
   ```

2. **Add diagram markers** around the output diagram:
   ```markdown
   <!-- DIAGRAM: my-example-er START -->
   **Output:**
   ```mermaid
   erDiagram
   ...
   ```
   <!-- DIAGRAM: my-example-er END -->
   ```

3. **Update the script** (`regenerate-readme.ts`):
   - Extract the schema: `const myCode = extractSchemaCode(readme, 'my-example');`
   - Execute it: `const mySchemas = myCode ? executeSchemaCode(myCode, sharedContext) : null;`
   - Generate diagram: Add to `diagrams` object
   - Add to `replacements` array

4. **Test**: Run `npm run regenerate:readme`

The key advantage: You only write the schema code once (in the README), and the script extracts and executes it automatically!
