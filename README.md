# Zod Mermaid

A TypeScript library for working with Zod schemas and Mermaid diagrams.

## Features

- Type-safe schema validation with Zod
- Mermaid diagram generation from schemas
- Comprehensive TypeScript support
- Strict coding standards and linting

## Installation

```bash
npm install zod-mermaid
```

## Usage

```typescript
import { z } from 'zod';
import { generateMermaidDiagram } from 'zod-mermaid';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0).max(120),
});

const diagram = generateMermaidDiagram(UserSchema);
console.log(diagram);
```

## Development

### Prerequisites

- Node.js >= 16.0.0
- npm or yarn

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Available Scripts

- `npm run build` - Build the project
- `npm run dev` - Build in watch mode
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking

### Code Standards

This project follows strict coding standards:

- **TypeScript**: Strict mode with comprehensive type checking
- **ESLint**: Extensive linting rules for code quality
- **Prettier**: Consistent code formatting
- **Jest**: Comprehensive testing with coverage requirements
- **Import ordering**: Organized imports with alphabetical sorting
- **Naming conventions**: Consistent naming for types, interfaces, and enums

### Project Structure

```
src/
├── index.ts          # Main library entry point
├── types/            # Type definitions
├── utils/            # Utility functions
├── generators/       # Mermaid diagram generators
└── test/            # Test utilities and setup
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the coding standards
4. Add tests for new functionality
5. Ensure all tests pass and linting is clean
6. Submit a pull request

## License

MIT 