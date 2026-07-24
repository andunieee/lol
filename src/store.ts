import { createSignal } from "solid-js";

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

let counter = 0;
const newId = (): NodeId => `n${++counter}`;

function seed(): Tree {
  const tree: Tree = {};
  let root: NodeId | null = null;

  const add = (
    text: string,
    parentId: NodeId | null,
    children: string[] = [],
  ): NodeId => {
    const id = newId();
    tree[id] = {
      id,
      text,
      note: "",
      completed: false,
      collapsed: false,
      children,
      parentId,
    };
    if (parentId === null) {
      root = id;
    } else {
      tree[parentId].children.push(id);
    }
    return id;
  };

  const groceries = add("Groceries", root);
  add("Oat milk", groceries);
  add("Sourdough", groceries);
  const coffee = add("Coffee", groceries);
  add("Whole beans", coffee);
  add("Ground", coffee);

  const projects = add("Projects", root);
  add("Finish nflowy", projects);
  add("Ship v1", projects);

  return tree;
}

const [tree, setTree] = createSignal<Tree>(seed());
const [rootId, setRootId] = createSignal<NodeId | null>(null);
const [focusId, setFocusId] = createSignal<NodeId | null>(null);

export { tree, setTree, rootId, setRootId, focusId, setFocusId, newId };