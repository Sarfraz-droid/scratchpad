// Pulls readable content AND structure out of a tldraw store snapshot (as
// saved by PUT /api/canvas/:projectId — see apps/web's CanvasView, which
// calls tldraw's `getSnapshot`). "Structure" is what lets the model
// understand how pieces relate, not just list them in isolation:
//   - `parentId` on a shape: which frame/group it's inside.
//   - `binding` records of type "arrow": which shape an arrow connects
//     from/to (tldraw stores arrow connections as separate records, not as
//     fields on the arrow shape itself).

export interface CanvasSnippet {
  shapeId: string;
  shapeType: string;
  text: string;
}

interface CanvasNode {
  id: string;
  type: string;
  text: string;
  parentId: string | null;
}

interface CanvasConnection {
  fromId: string | null;
  toId: string | null;
  label: string;
}

// tldraw shapes migrated from a plain `props.text` string to a ProseMirror-style
// `props.richText` document (`{ type: "doc", content: [...] }`) in newer
// versions. Support both so this doesn't silently break on a tldraw upgrade.
function extractRichText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;
  if (typeof n.text === "string") return n.text;
  if (Array.isArray(n.content)) return n.content.map(extractRichText).join(" ");
  return "";
}

function getStoreRecords(snapshot: unknown): Record<string, unknown> | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const root = snapshot as Record<string, unknown>;
  // `getSnapshot()` returns a TLEditorSnapshot: `{ document: { store, schema }, session }`.
  // Older/raw callers may instead pass a bare TLStoreSnapshot (`{ store, schema }`).
  const document = root.document as Record<string, unknown> | undefined;
  const store = (document?.store ?? root.store) as Record<string, unknown> | undefined;
  return store && typeof store === "object" ? store : null;
}

// The shape's own label/content, with no decoration (no "Frame ..." prefix,
// no URL appended) — callers decide how to present it.
function getShapeLabel(record: Record<string, unknown>): string {
  const props = (record.props ?? {}) as Record<string, unknown>;
  if (record.type === "frame" && typeof props.name === "string") return props.name.trim();
  if (record.type === "bookmark" && typeof props.url === "string") return String(props.url);
  if (typeof props.text === "string") return props.text.trim();
  return extractRichText(props.richText).trim();
}

function buildGraph(snapshot: unknown): { nodes: CanvasNode[]; connections: CanvasConnection[] } {
  const store = getStoreRecords(snapshot);
  if (!store) return { nodes: [], connections: [] };

  const nodes: CanvasNode[] = [];
  // arrowId -> { start: boundShapeId, end: boundShapeId }
  const arrowEnds = new Map<string, Partial<Record<"start" | "end", string>>>();

  for (const value of Object.values(store)) {
    if (!value || typeof value !== "object") continue;
    const record = value as Record<string, unknown>;

    if (record.typeName === "shape") {
      nodes.push({
        id: String(record.id),
        type: String(record.type),
        text: getShapeLabel(record),
        parentId: typeof record.parentId === "string" ? record.parentId : null,
      });
    } else if (record.typeName === "asset") {
      const props = (record.props ?? {}) as Record<string, unknown>;
      if (typeof props.name === "string" && props.name.trim()) {
        nodes.push({ id: String(record.id), type: `asset:${record.type}`, text: props.name.trim(), parentId: null });
      }
    } else if (record.typeName === "binding" && record.type === "arrow") {
      const arrowId = String(record.fromId);
      const boundShapeId = String(record.toId);
      const terminal = (record.props as Record<string, unknown> | undefined)?.terminal;
      const entry = arrowEnds.get(arrowId) ?? {};
      if (terminal === "start" || terminal === "end") entry[terminal] = boundShapeId;
      arrowEnds.set(arrowId, entry);
    }
  }

  const connections: CanvasConnection[] = [];
  for (const [arrowId, ends] of arrowEnds) {
    const arrowNode = nodes.find((n) => n.id === arrowId);
    connections.push({ fromId: ends.start ?? null, toId: ends.end ?? null, label: arrowNode?.text ?? "" });
  }

  return { nodes, connections };
}

export interface CanvasImage {
  assetId: string;
  name: string;
  // A data: URI (tldraw's default local asset store embeds uploaded images as
  // base64) or an http(s) URL if a custom asset store is ever wired up later.
  // Null when the asset record has no usable src (e.g. broken/placeholder).
  src: string | null;
}

// Images placed on the canvas, with their raw image data — separate from
// extractCanvasSnippets/describeCanvasStructure because this is used to
// actually *view* an image (vision model call), not just name-drop it.
export function extractCanvasImages(snapshot: unknown): CanvasImage[] {
  const store = getStoreRecords(snapshot);
  if (!store) return [];

  const images: CanvasImage[] = [];
  for (const value of Object.values(store)) {
    if (!value || typeof value !== "object") continue;
    const record = value as Record<string, unknown>;
    if (record.typeName !== "asset" || record.type !== "image") continue;
    const props = (record.props ?? {}) as Record<string, unknown>;
    images.push({
      assetId: String(record.id),
      name: typeof props.name === "string" && props.name.trim() ? props.name.trim() : "Untitled image",
      src: typeof props.src === "string" && props.src ? props.src : null,
    });
  }
  return images;
}

export function extractCanvasSnippets(snapshot: unknown): CanvasSnippet[] {
  const { nodes } = buildGraph(snapshot);
  const snippets: CanvasSnippet[] = [];
  for (const node of nodes) {
    if (!node.text) continue;
    if (node.type === "arrow") continue; // surfaced via connections instead
    const text = node.type === "frame" ? `Frame "${node.text}"` : node.text;
    snippets.push({ shapeId: node.id, shapeType: node.type, text });
  }
  return snippets;
}

export function formatCanvasSnippets(snippets: CanvasSnippet[], limit = 60): string {
  if (snippets.length === 0) return "";
  return snippets
    .slice(0, limit)
    .map((s) => `- [${s.shapeType}] ${s.text}`)
    .join("\n");
}

// The structural view: what's grouped inside which frame, and what arrows
// connect to what. This is what answers "how do these pieces relate?" rather
// than just "what's on the canvas?".
export function describeCanvasStructure(snapshot: unknown): string {
  const { nodes, connections } = buildGraph(snapshot);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const labelFor = (id: string | null): string => {
    if (!id) return "(nothing)";
    const node = byId.get(id);
    if (!node) return id;
    return node.text ? node.text : `an unlabeled ${node.type}`;
  };

  const frames = nodes.filter((n) => n.type === "frame");
  const framed = new Set(frames.map((f) => f.id));
  const lines: string[] = [];

  for (const frame of frames) {
    const children = nodes.filter((n) => n.parentId === frame.id && n.text && n.type !== "arrow");
    lines.push(`Frame "${frame.text || "Untitled"}" groups together:`);
    if (children.length === 0) {
      lines.push("  (empty)");
    } else {
      for (const child of children) lines.push(`  - [${child.type}] ${child.text}`);
    }
  }

  const loose = nodes.filter(
    (n) => n.text && n.type !== "arrow" && !framed.has(n.id) && !(n.parentId && framed.has(n.parentId)),
  );
  if (loose.length > 0) {
    lines.push(lines.length > 0 ? "\nOther items not inside any frame:" : "Items on the canvas:");
    for (const item of loose) lines.push(`  - [${item.type}] ${item.text}`);
  }

  if (connections.length > 0) {
    lines.push("\nArrows connecting them:");
    for (const c of connections) {
      const label = c.label ? ` (labeled "${c.label}")` : "";
      lines.push(`  - ${labelFor(c.fromId)} → ${labelFor(c.toId)}${label}`);
    }
  }

  return lines.length > 0 ? lines.join("\n") : "";
}
