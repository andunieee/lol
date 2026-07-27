import { batch } from "solid-js";
import { produce } from "solid-js/store";
import {
  tree,
  setTree,
  rootId,
  setRootId,
  newId,
  blankNode,
  requestFocus,
  setDragId,
  setDropTarget,
  ROOT,
  type NodeId,
  type DropPos,
} from "./store";

/* ---------- queries ---------- */

export function isDescendant(id: NodeId, ancestorId: NodeId): boolean {
  let p = tree[id]?.parentId ?? null;
  while (p !== null) {
    if (p === ancestorId) return true;
    p = tree[p].parentId;
  }
  return false;
}

/** Everything focusable in the current view, top to bottom (zoomed title first). */
export function visibleOrder(): NodeId[] {
  const out: NodeId[] = rootId() === ROOT ? [] : [rootId()];
  const walk = (id: NodeId) => {
    for (const c of tree[id].children) {
      out.push(c);
      if (!tree[c].collapsed) walk(c);
    }
  };
  walk(rootId());
  return out;
}

export function neighbor(id: NodeId, dir: -1 | 1): NodeId | undefined {
  const order = visibleOrder();
  return order[order.indexOf(id) + dir];
}

/* ---------- editing ---------- */

export const updateText = (id: NodeId, text: string) =>
  setTree(id, "text", text);
export const updateNote = (id: NodeId, note: string) =>
  setTree(id, "note", note);
export const toggleCompleted = (id: NodeId) =>
  setTree(id, "completed", (c) => !c);
export const setCollapsed = (id: NodeId, collapsed: boolean) => {
  if (tree[id].children.length) setTree(id, "collapsed", collapsed);
};

export function createNode(parentId: NodeId, index: number, text = ""): NodeId {
  const id = newId();
  setTree(
    produce((t) => {
      t[id] = blankNode(id, parentId, text);
      t[parentId].children.splice(index, 0, id);
    }),
  );
  return id;
}

export function removeNode(id: NodeId): void {
  setTree(
    produce((t) => {
      const parent = t[id].parentId;
      if (parent !== null) {
        const siblings = t[parent].children;
        siblings.splice(siblings.indexOf(id), 1);
      }
      const drop = (n: NodeId) => {
        for (const c of t[n].children) drop(c);
        delete t[n];
      };
      drop(id);
    }),
  );
}

/** Delete a node and put the caret somewhere sensible. */
export function removeWithFocus(id: NodeId): void {
  const parent = tree[id].parentId!;
  if (parent === rootId() && tree[parent].children.length === 1) return;
  const prev = neighbor(id, -1);
  const order = visibleOrder();
  const next = order.slice(order.indexOf(id) + 1).find((n) => !isDescendant(n, id));
  batch(() => {
    removeNode(id);
    if (prev !== undefined && prev !== rootId()) requestFocus(prev, "text", "end");
    else if (next) requestFocus(next, "text", "start");
    else if (prev) requestFocus(prev, "text", "end");
  });
}

/** Append `srcId` onto `targetId`; returns the caret offset at the join. */
function mergeInto(targetId: NodeId, srcId: NodeId): number {
  let caret = 0;
  setTree(
    produce((t) => {
      const g = t[targetId];
      const s = t[srcId];
      caret = g.text.length;
      g.text += s.text;
      if (s.note) g.note = g.note ? `${g.note}\n${s.note}` : s.note;
      const sp = t[s.parentId!];
      const i = sp.children.indexOf(srcId);
      sp.children.splice(i, 1);
      if (s.children.length) {
        const kids = [...s.children];
        if (s.parentId === targetId) sp.children.splice(i, 0, ...kids);
        else g.children.push(...kids);
        for (const c of kids) t[c].parentId = targetId;
      }
      delete t[srcId];
    }),
  );
  return caret;
}

export function backspaceAtStart(id: NodeId): void {
  const n = tree[id];
  if (n.text === "" && n.children.length === 0 && !n.note) {
    removeWithFocus(id);
    return;
  }
  const prev = neighbor(id, -1);
  if (prev === undefined || prev === rootId()) return;
  batch(() => {
    const caret = mergeInto(prev, id);
    requestFocus(prev, "text", caret);
  });
}

export function deleteAtEnd(id: NodeId): void {
  const next = neighbor(id, 1);
  if (next === undefined) return;
  batch(() => {
    const caret = mergeInto(id, next);
    requestFocus(id, "text", caret);
  });
}

/** Enter: split the item at the caret (or step out of an empty nested item). */
export function splitAtCaret(id: NodeId, start: number, end: number): void {
  const n = tree[id];
  const parent = n.parentId!;
  if (n.text === "" && parent !== rootId()) {
    outdent(id);
    requestFocus(id, "text", "start");
    return;
  }
  batch(() => {
    if (start === 0 && end === 0 && n.text !== "") {
      createNode(parent, tree[parent].children.indexOf(id));
      requestFocus(id, "text", 0);
      return;
    }
    const before = n.text.slice(0, start);
    const after = n.text.slice(end);
    updateText(id, before);
    const fresh =
      n.children.length && !n.collapsed
        ? createNode(id, 0, after)
        : createNode(parent, tree[parent].children.indexOf(id) + 1, after);
    requestFocus(fresh, "text", "start");
  });
}

/** Multi-line paste: first line joins the caret, the rest become siblings. */
export function pasteLines(
  id: NodeId,
  start: number,
  end: number,
  rawLines: string[],
): void {
  const lines = rawLines
    .map((l) => l.replace(/^\s*(?:[-*•]\s+)?/, "").trimEnd())
    .filter(Boolean);
  if (!lines.length) return;
  const n = tree[id];
  const parent = n.parentId!;
  batch(() => {
    const tail = n.text.slice(end);
    updateText(id, n.text.slice(0, start) + lines[0]);
    let last = id;
    let at = tree[parent].children.indexOf(id) + 1;
    for (const line of lines.slice(1)) {
      last = createNode(parent, at++, line);
    }
    const caret = tree[last].text.length;
    updateText(last, tree[last].text + tail);
    requestFocus(last, "text", caret);
  });
}

/* ---------- structure ---------- */

export function moveNode(id: NodeId, parentId: NodeId, index: number): void {
  if (id === parentId || isDescendant(parentId, id)) return;
  setTree(
    produce((t) => {
      const old = t[id].parentId!;
      const arr = t[old].children;
      const i = arr.indexOf(id);
      arr.splice(i, 1);
      if (old === parentId && i < index) index--;
      t[parentId].children.splice(index, 0, id);
      t[id].parentId = parentId;
    }),
  );
}

export function indent(id: NodeId): boolean {
  const parent = tree[id].parentId!;
  const sibs = tree[parent].children;
  const idx = sibs.indexOf(id);
  if (idx <= 0) return false;
  const prev = sibs[idx - 1];
  batch(() => {
    moveNode(id, prev, tree[prev].children.length);
    setTree(prev, "collapsed", false);
  });
  return true;
}

export function outdent(id: NodeId): boolean {
  const parent = tree[id].parentId!;
  if (parent === rootId()) return false;
  const gp = tree[parent].parentId!;
  moveNode(id, gp, tree[gp].children.indexOf(parent) + 1);
  return true;
}

export function moveUp(id: NodeId): void {
  const parent = tree[id].parentId!;
  const idx = tree[parent].children.indexOf(id);
  if (idx > 0) {
    moveNode(id, parent, idx - 1);
  } else if (parent !== rootId()) {
    const gp = tree[parent].parentId!;
    moveNode(id, gp, tree[gp].children.indexOf(parent));
  }
}

export function moveDown(id: NodeId): void {
  const parent = tree[id].parentId!;
  const sibs = tree[parent].children;
  const idx = sibs.indexOf(id);
  if (idx < sibs.length - 1) {
    moveNode(id, parent, idx + 2);
  } else if (parent !== rootId()) {
    const gp = tree[parent].parentId!;
    moveNode(id, gp, tree[gp].children.indexOf(parent) + 1);
  }
}

/* ---------- zoom ---------- */

/** Zoom to `id` and drop the caret in its first child (creating one if empty). */
export function zoomTo(id: NodeId, focus: NodeId | null = null): void {
  batch(() => {
    setRootId(id);
    if (tree[id].children.length === 0) createNode(id, 0);
    requestFocus(focus ?? tree[id].children[0], "text", "end");
  });
}

export const zoomInto = (id: NodeId) => zoomTo(id);

export function zoomOut(): void {
  const r = rootId();
  if (r === ROOT) return;
  zoomTo(tree[r].parentId!, r);
}

/* ---------- drag & drop ---------- */

export function endDrag(): void {
  setDragId(null);
  setDropTarget(null);
}

export function dropNode(dragged: NodeId, target: NodeId, pos: DropPos): void {
  if (dragged === target || isDescendant(target, dragged)) return endDrag();
  batch(() => {
    if (pos === "child") {
      moveNode(dragged, target, 0);
      setTree(target, "collapsed", false);
    } else {
      const p = tree[target].parentId!;
      const idx = tree[p].children.indexOf(target);
      moveNode(dragged, p, pos === "before" ? idx : idx + 1);
    }
    endDrag();
  });
}
