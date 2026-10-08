import { Box, createShapeId, toRichText, type TLShapeId, type TLShapePartial } from "tldraw";
import type { CanvasElementAction } from "@scratchpad/shared";
import { useCanvasStore } from "@/store/useCanvasStore";

const SEARCH_STEP = 40; // page-unit resolution of the empty-space search grid
const MARGIN = 24; // minimum gap kept between a new element and anything else
const MAX_RINGS = 60; // ~2400px search radius before giving up and placing far away
const TEXT_WRAP_WIDTH = 300; // fixed wrap width for text shapes — see note below

// A *starting guess* only. tldraw notes autosize their height to fit their
// text (see `growY`), and text shapes autosize both dimensions unless given a
// fixed width — neither is knowable exactly before the shape actually
// renders. So this is just good enough to pick a first candidate spot; the
// real, rendered bounds are re-checked (and the shape moved if needed) after
// creation in applyCanvasActions below.
function estimatedSizeFor(action: CanvasElementAction): { w: number; h: number } {
  if (action.kind === "frame") return { w: 320, h: 240 };
  if (action.kind === "text") return { w: TEXT_WRAP_WIDTH, h: 60 };
  return { w: 200, h: Math.max(200, Math.ceil(action.text.length / 20) * 28 + 60) }; // note: rough line-count guess
}

// Concentric square "rings" of grid offsets around (0,0), nearest first — used
// to search outward from a starting point for the first free spot.
function ringOffsets(ring: number): Array<[number, number]> {
  if (ring === 0) return [[0, 0]];
  const offsets: Array<[number, number]> = [];
  for (let dx = -ring; dx <= ring; dx++) offsets.push([dx, -ring], [dx, ring]);
  for (let dy = -ring + 1; dy <= ring - 1; dy++) offsets.push([-ring, dy], [ring, dy]);
  return offsets;
}

// Finds the nearest position to (startX, startY) where a `w`x`h` box doesn't
// collide with anything in `occupied`.
function findFreeSpot(occupied: Box[], w: number, h: number, startX: number, startY: number): { x: number; y: number } {
  for (let ring = 0; ring <= MAX_RINGS; ring++) {
    for (const [dx, dy] of ringOffsets(ring)) {
      const x = startX + dx * SEARCH_STEP;
      const y = startY + dy * SEARCH_STEP;
      const candidate = new Box(x, y, w, h);
      if (!occupied.some((box) => Box.Collides(box, candidate))) return { x, y };
    }
  }
  return { x: startX + MAX_RINGS * SEARCH_STEP, y: startY };
}

function shapePartialFor(action: CanvasElementAction, id: TLShapeId, x: number, y: number): TLShapePartial {
  if (action.kind === "frame") {
    return { id, type: "frame", x, y, props: { name: action.text, w: 320, h: 240 } };
  }
  if (action.kind === "text") {
    // Fixed width + autoSize:false forces wrapping instead of tldraw's default
    // of growing to one unbroken line, which for anything but a short label
    // produced a shape many hundreds of pixels wide that ran straight through
    // whatever was next to it.
    return {
      id,
      type: "text",
      x,
      y,
      props: { richText: toRichText(action.text), w: TEXT_WRAP_WIDTH, autoSize: false },
    };
  }
  return {
    id,
    type: "note",
    x,
    y,
    props: { richText: toRichText(action.text), color: action.color ?? "yellow" },
  };
}

// Applies canvas elements the chat model asked to create (see the
// `create_canvas_elements` tool in apps/server) against the *live* tldraw
// editor for this project. Shapes are created through tldraw's own editor
// API — not written directly into the stored snapshot — so tldraw fills in
// correct defaults (size, font, index) and the existing autosave listener in
// CanvasView picks up and persists the change naturally, with no separate
// write path to keep in sync.
//
// Placement is a two-pass process per element: place at a best-guess empty
// spot, then re-check against the shape's *actual rendered* bounds (which for
// autosizing notes/text can differ a lot from the guess) and reposition if
// that real box turns out to collide with anything.
export function applyCanvasActions(projectId: string, actions: CanvasElementAction[]): void {
  if (actions.length === 0) return;
  const editor = useCanvasStore.getState().editorByProject[projectId];
  if (!editor) return;

  // Treat every existing shape's bounds as occupied so new elements land on
  // empty canvas, not on top of the user's existing notes/images/frames.
  const occupied = [...editor.getCurrentPageShapeIds()]
    .map((id) => editor.getShapePageBounds(id))
    .filter((box): box is Box => Boolean(box))
    .map((box) => Box.ExpandBy(box, MARGIN));

  const viewport = editor.getViewportPageBounds();
  const startX = viewport.center.x;
  const startY = viewport.center.y;

  const ids: TLShapeId[] = [];

  for (const action of actions) {
    const estimate = estimatedSizeFor(action);
    const guess = findFreeSpot(occupied, estimate.w, estimate.h, startX, startY);

    const id = createShapeId();
    editor.createShape(shapePartialFor(action, id, guess.x, guess.y));

    // Validation pass: check the shape's real rendered bounds, not the guess.
    const realBounds = editor.getShapePageBounds(id);
    let finalBox = realBounds ? Box.ExpandBy(realBounds, 0) : new Box(guess.x, guess.y, estimate.w, estimate.h);

    const stillOccupied = occupied.filter((box) => box !== finalBox);
    const collides = stillOccupied.some((box) => Box.Collides(box, finalBox));
    if (collides) {
      const corrected = findFreeSpot(stillOccupied, finalBox.w, finalBox.h, startX, startY);
      editor.updateShape({ id, type: action.kind, x: corrected.x, y: corrected.y });
      finalBox = new Box(corrected.x, corrected.y, finalBox.w, finalBox.h);
    }

    occupied.push(Box.ExpandBy(finalBox, MARGIN));
    ids.push(id);
  }

  editor.select(...ids);
}
