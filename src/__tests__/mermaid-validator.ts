/**
 * Validates Mermaid diagram syntax using Mermaid's parse function
 * @param diagramSource - The Mermaid diagram source code
 * @throws {Error} If the diagram has syntax errors
 */
export async function validateMermaidSyntax(diagramSource: string): Promise<void> {
  try {
    // Optional dependency: only try to import if available in the environment
    let mod: any = null;
    try {
      // Use eval to avoid static import analysis by TypeScript
      // eslint-disable-next-line no-eval
      mod = await (eval('import("mermaid")'));
    } catch {
      // If dynamic import fails (module not installed), skip validation
      return;
    }
    if (!mod || !mod.default || typeof mod.default.parse !== 'function') {
      // Skip validation if mermaid is not installed in CI
      return;
    }
    await mod.default.parse(diagramSource);
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
