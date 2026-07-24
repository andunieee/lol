import { tree, setTree, rootId, setRootId, newId, type NodeId, type Node } from "./store";

export function addChild(parentId: NodeId): NodeId {
  const id = newId();
  setTree((t) => {
    const next = { ...t };
    next[id] = {
      id,
      text: "",
      note: "",
      completed: false,
      collapsed: false,
      children: [],
      parentId,
    };
    next[parentId] = {
      ...next[parentId],
      children: [...next[parentId].children, id],
    };
    return next;
  });
  return id;
}

export function addSibling(nodeId: NodeId): NodeId | null {
  const t = tree();
  const node = t[nodeId];
  if (!node || node.parentId === null) return null;
  return addChild(node.parentId);
}

export function removeNode(nodeId: NodeId): void {
  setTree((t) => {
    const node = t[nodeId];
    if (!node) return t;
    const next = { ...t };
    const removeRec = (id: NodeId) => {
      const n = next[id];
      if (!n) return;
      for (const c of n.children) removeRec(c);
      delete next[id];
    };
    removeRec(nodeId);
    if (node.parentId !== null && next[node.parentId]) {
      next[node.parentId] = {
        ...next[node.parentId],
        children: next[node.parentId].children.filter((c) => c !== nodeId),
      };
    }
    return next;
  });
}

export function updateText(nodeId: NodeId, text: string): void {
  setTree((t) => ({
    ...t,
    [nodeId]: { ...t[nodeId], text },
  }));
}

export function updateNote(nodeId: NodeId, note: string): void {
  setTree((t) => ({
    ...t,
    [nodeId]: { ...t[nodeId], note },
  }));
}

export function toggleCompleted(nodeId: NodeId): void {
  setTree((t) => ({
    ...t,
    [nodeId]: { ...t[nodeId], completed: !t[nodeId].completed },
  }));
}

export function toggleCollapsed(nodeId: NodeId): void {
  setTree((t) => ({
    ...t,
    [nodeId]: { ...t[nodeId], collapsed: !t[nodeId].collapsed },
  }));
}

export function zoomInto(nodeId: NodeId): void {
  setRootId(nodeId);
}

export function zoomOut(): void {
  const r = rootId();
  if (r === null) return;
  setRootId(tree()[r].parentId);
}

export function canZoomOut(): boolean {
  const r = rootId();
  return r !== null;
}

export function moveUp(nodeId: NodeId): void {
  setTree((t) => {
    const node = t[nodeId];
    if (!node || node.parentId === null) return t;
    const parent = t[node.parentId];
    const idx = parent.children.indexOf(nodeId);
    if (idx <= 0) return t;
    const children = [...parent.children];
    [children[idx - 1], children[idx]] = [children[idx], children[idx - 1]];
    return { ...t, [parent.id]: { ...parent, children } };
  });
}

export function moveDown(nodeId: NodeId): void {
  setTree((t) => {
    const node = t[nodeId];
    if (!node || node.parentId === null) return t;
    const parent = t[node.parentId];
    const idx = parent.children.indexOf(nodeId);
    if (idx === -1 || idx >= parent.children.length - 1) return t;
    const children = [...parent.children];
    [children[idx + 1], children[idx]] = [children[idx], children[idx + 1]];
    return { ...t, [parent.id]: { ...parent, children } };
  });
}

export function indent(nodeId: NodeId): void {
  setTree((t) => {
    const node = t[nodeId];
    if (!node || node.parentId === null) return t;
    const parent = t[node.parentId];
    const idx = parent.children.indexOf(nodeId);
    if (idx <= 0) return t;
    const prevSiblingId = parent.children[idx - 1];
    const prevSibling = t[prevSiblingId];
    const newParentChildren = parent.children.filter((c) => c !== nodeId);
    const newPrevChildren = [...prevSibling.children, nodeId];
    return {
      ...t,
      [parent.id]: { ...parent, children: newParentChildren },
      [prevSiblingId]: { ...prevSibling, children: newPrevChildren },
      [nodeId]: { ...node, parentId: prevSiblingId },
    };
  });
}

export function outdent(nodeId: NodeId): void {
  setTree((t) => {
    const node = t[nodeId];
    if (!node || node.parentId === null) return t;
    const parent = t[node.parentId];
    if (parent.parentId === null) return t;
    const grandparent = t[parent.parentId];
    const parentIdx = grandparent.children.indexOf(parent.id);
    const insertAt = parentIdx + 1;
    const newGrandparentChildren = [...grandparent.children];
    newGrandparentChildren.splice(insertAt, 0, nodeId);
    const newParentChildren = parent.children.filter((c) => c !== nodeId);
    return {
      ...t,
      [grandparent.id]: { ...grandparent, children: newGrandparentChildren },
      [parent.id]: { ...parent, children: newParentChildren },
      [nodeId]: { ...node, parentId: grandparent.id },
    };
  });
}

export function getChildIds(nodeId: NodeId | null): NodeId[] {
  const t = tree();
  if (nodeId === null) {
    return Object.values(t)
      .filter((n) => n.parentId === null)
      .map((n) => n.id);
  }
  return t[nodeId]?.children.slice() ?? [];
}

export function getChildren(nodeId: NodeId | null): Node[] {
  return getChildIds(nodeId).map((id) => tree()[id]);
}

export { type NodeId, type Node };