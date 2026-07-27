import { createSignal } from "solid-js";
import { createStore } from "solid-js/store";

export type NodeId = string;

export interface Node {
  id: NodeId;
  text: string;
  note: string;
  completed: boolean;
  collapsed: boolean;
  children: NodeId[];
  parentId: NodeId | null;
}

export type Tree = Record<NodeId, Node>;

/** Hidden root that holds the top-level items. Never rendered. */
export const ROOT: NodeId = "root";

let counter = 0;
const newId = (): NodeId => `n${++counter}`;

export const blankNode = (
  id: NodeId,
  parentId: NodeId | null,
  text = "",
): Node => ({
  id,
  text,
  note: "",
  completed: false,
  collapsed: false,
  children: [],
  parentId,
});

function seed(): Tree {
  const tree: Tree = { [ROOT]: blankNode(ROOT, null) };

  const add = (text: string, parentId: NodeId, note = ""): NodeId => {
    const id = newId();
    tree[id] = { ...blankNode(id, parentId, text), note };
    tree[parentId].children.push(id);
    return id;
  };

  const groceries = add("Groceries", ROOT);
  add("Oat milk", groceries);
  add("Sourdough", groceries);
  const coffee = add("Coffee", groceries);
  add("Whole beans", coffee);
  add("Ground", coffee);

  const projects = add("Projects", ROOT);
  add(
    "Finish nflowy",
    projects,
    "Shift+Enter edits this description. Drag a bullet to move it, click one to zoom.",
  );
  add("Ship v1", projects);

  return tree;
}

const [tree, setTree] = createStore<Tree>(seed());

/** The node we're zoomed into; ROOT means the home view. */
const [rootId, setRootId] = createSignal<NodeId>(ROOT);

export type Caret = "start" | "end" | number;
export interface FocusRequest {
  id: NodeId;
  field: "text" | "note";
  caret: Caret;
}

/** One-shot request; the matching textarea consumes it once mounted. */
const [focusReq, setFocusReq] = createSignal<FocusRequest | null>(null);
export const requestFocus = (
  id: NodeId,
  field: "text" | "note" = "text",
  caret: Caret = "end",
) => setFocusReq({ id, field, caret });

/** Node whose (still empty) description is currently open for editing. */
const [openNoteId, setOpenNoteId] = createSignal<NodeId | null>(null);

export type DropPos = "before" | "after" | "child";
const [dragId, setDragId] = createSignal<NodeId | null>(null);
const [dropTarget, setDropTarget] = createSignal<{
  id: NodeId;
  pos: DropPos;
} | null>(null);

export {
  tree,
  setTree,
  rootId,
  setRootId,
  focusReq,
  setFocusReq,
  openNoteId,
  setOpenNoteId,
  dragId,
  setDragId,
  dropTarget,
  setDropTarget,
  newId,
};
