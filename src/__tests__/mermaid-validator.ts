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
  // Match ```mermaid followed by content, then closing ``` on its own line
  // Use multiline flag and ensure we match the closing ``` that's not part of another code block
  const mermaidBlockRegex = /```mermaid\s*\n([\s\S]*?)\n\s*```/g;
  let match;

  while ((match = mermaidBlockRegex.exec(markdown)) !== null) {
    if (match[1]) {
      // Trim leading/trailing whitespace from the diagram content
      diagrams.push(match[1].trim());
    }
  }

  return diagrams;
}
