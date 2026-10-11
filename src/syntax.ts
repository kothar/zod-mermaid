/** @module syntax */

// Keywords are reserved across the supported Mermaid grammars.
const RESERVED = new Set([
  'end',
  'class',
  'classDiagram',
  'erDiagram',
  'flowchart',
  'subgraph',
  'direction',
  'style',
  'classDef',
  'click',
  'title',
  'accTitle',
  'accDescr',
  'PK',
  'FK',
  'UK',
]);

/** Allocate a stable identifier without collisions, including normalization collisions. */
export function allocateName(label: string, used: Set<string>, attribute = false): string {
  let base = label.replace(/[^a-zA-Z0-9_]/g, '_');
  if (
    !/^[a-zA-Z]/.test(base) ||
    (attribute ? ['PK', 'FK', 'UK'].includes(base) : RESERVED.has(base))
  )
    base = `Entity_${base}`;
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) candidate = `${base}_${suffix++}`;
  used.add(candidate);
  return candidate;
}

/** Escape content before placing it inside Mermaid quoted labels or comments. */
export function escapeLabel(value: string): string {
  return (
    value
      .replace(/[&<>"`#%\\\r\n{}]/g, character => {
        switch (character) {
          case '#':
            return '#35;';
          case '%':
            return '#37;';
          case '&':
            return '&amp;';
          case '<':
            return '&lt;';
          case '>':
            return '&gt;';
          case '"':
            return '&quot;';
          case '\r':
          case '\n':
            return ' ';
          case '{':
            return '&lbrace;';
          case '}':
            return '&rbrace;';
          case '`':
            return '&grave;';
          default:
            return '&bsol;';
        }
      })
      // Mermaid recognizes direction statements even inside some quoted labels.
      .replace(/direction\s+/g, 'direction#32;')
  );
}

/** Class relationship labels cannot contain literal colons or semicolons. */
export function escapeClassRelationship(value: string): string {
  return (
    value
      .replace(/[&<>"`:;#\\{}\r\n]/g, character =>
        character === '\n' || character === '\r' ? ' ' : `#${character.charCodeAt(0)};`,
      )
      .replace(/direction\s+/g, 'direction#32;') || '""'
  );
}
