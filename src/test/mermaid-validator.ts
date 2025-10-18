/**
 * Validates Mermaid diagram syntax using Mermaid's parse function
 * @param diagramSource - The Mermaid diagram source code
 * @throws {Error} If the diagram has syntax errors
 */
export async function validateMermaidSyntax(diagramSource: string): Promise<void> {
  try {
    const { default: mermaid } = await import('mermaid');
    await mermaid.parse(diagramSource);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid Mermaid syntax:\n${message}\n\nDiagram:\n${diagramSource}`);
  }
}

/**
 * Extracts Mermaid code blocks from markdown content
 * @param markdown - Markdown content containing mermaid code blocks
 * @returns Array of mermaid diagram sources
 */
export function extractMermaidDiagrams(markdown: string): string[] {
  const diagrams: string[] = [];
  const mermaidBlockRegex = /```mermaid\n([\s\S]*?)\n```/g;
  let match;

  while ((match = mermaidBlockRegex.exec(markdown)) !== null) {
    if (match[1]) {
      diagrams.push(match[1]);
    }
  }

  return diagrams;
}
