import { batch } from "solid-js";
import { tree, rootId, requestFocus, setOpenNoteId, type NodeId } from "./store";
import { caretLine } from "./caret";
import * as a from "./actions";

const hasMod = (e: KeyboardEvent) => e.ctrlKey || e.metaKey;

/** Keyboard bindings for an item's text, modelled on Workflowy. */
export function textKeyDown(id: NodeId, e: KeyboardEvent): void {
  if (e.isComposing) return;
  const el = e.currentTarget as HTMLTextAreaElement;
  const s = el.selectionStart;
  const end = el.selectionEnd;
  const mod = hasMod(e);

  switch (e.key) {
    case "Enter":
      e.preventDefault();
      if (mod) a.toggleCompleted(id);
      else if (e.shiftKey) {
        setOpenNoteId(id);
        requestFocus(id, "note", "end");
      } else a.splitAtCaret(id, s, end);
      break;

    case "Tab":
      e.preventDefault();
      batch(() => {
        if (e.shiftKey) a.outdent(id);
        else a.indent(id);
        requestFocus(id, "text", s);
      });
      break;

    case "Backspace":
      if (mod && e.shiftKey) {
        e.preventDefault();
        a.removeWithFocus(id);
      } else if (s === 0 && end === 0) {
        e.preventDefault();
        a.backspaceAtStart(id);
      }
      break;

    case "Delete":
      if (s === el.value.length && end === s) {
        e.preventDefault();
        a.deleteAtEnd(id);
      }
      break;

    case "ArrowUp":
    case "ArrowDown": {
      const dir = e.key === "ArrowUp" ? -1 : 1;
      if (mod && e.shiftKey) {
        e.preventDefault();
        if (dir < 0) a.moveUp(id);
        else a.moveDown(id);
        requestFocus(id, "text", s);
      } else if (mod) {
        e.preventDefault();
        a.setCollapsed(id, dir < 0);
      } else if (!e.shiftKey && !e.altKey) {
        const line = caretLine(el);
        if (dir < 0 ? line.first : line.last) {
          const target = a.neighbor(id, dir);
          if (target) {
            e.preventDefault();
            requestFocus(target, "text", s);
          }
        }
      }
      break;
    }

    case "ArrowLeft":
      if (e.altKey) {
        e.preventDefault();
        a.zoomOut();
      } else if (s === 0 && end === 0 && !e.shiftKey && !mod) {
        const prev = a.neighbor(id, -1);
        if (prev) {
          e.preventDefault();
          requestFocus(prev, "text", "end");
        }
      }
      break;

    case "ArrowRight":
      if (e.altKey) {
        e.preventDefault();
        a.zoomInto(id);
      } else if (s === el.value.length && end === s && !e.shiftKey && !mod) {
        const next = a.neighbor(id, 1);
        if (next) {
          e.preventDefault();
          requestFocus(next, "text", "start");
        }
      }
      break;
  }
}

export function textPaste(id: NodeId, e: ClipboardEvent): void {
  const text = e.clipboardData?.getData("text/plain") ?? "";
  if (!/\r?\n/.test(text.trim())) return;
  e.preventDefault();
  const el = e.currentTarget as HTMLTextAreaElement;
  a.pasteLines(id, el.selectionStart, el.selectionEnd, text.split(/\r?\n/));
}

/** Bindings for a description; also used for the zoomed page's description. */
export function noteKeyDown(id: NodeId, e: KeyboardEvent): void {
  if (e.isComposing) return;
  const el = e.currentTarget as HTMLTextAreaElement;
  const plain = !e.shiftKey && !e.altKey && !hasMod(e);

  if (e.key === "Escape" || (e.key === "Enter" && e.shiftKey)) {
    e.preventDefault();
    requestFocus(id, "text", "end");
  } else if (e.key === "Backspace" && el.value === "") {
    e.preventDefault();
    setOpenNoteId(null);
    requestFocus(id, "text", "end");
  } else if (e.key === "ArrowUp" && plain && caretLine(el).first) {
    e.preventDefault();
    requestFocus(id, "text", "end");
  } else if (e.key === "ArrowDown" && plain && caretLine(el).last) {
    const next = a.neighbor(id, 1);
    if (next) {
      e.preventDefault();
      requestFocus(next, "text", "start");
    }
  }
}

/** Bindings for the page title when zoomed in. */
export function titleKeyDown(id: NodeId, e: KeyboardEvent): void {
  if (e.isComposing) return;
  const el = e.currentTarget as HTMLTextAreaElement;

  if (e.key === "Enter") {
    e.preventDefault();
    if (e.shiftKey) requestFocus(id, "note", "end");
    else requestFocus(a.createNode(rootId(), 0), "text", "start");
  } else if (e.key === "ArrowDown" && !e.shiftKey && caretLine(el).last) {
    const first = tree[id].children[0];
    if (first) {
      e.preventDefault();
      requestFocus(first, "text", "start");
    }
  } else if (e.key === "ArrowLeft" && e.altKey) {
    e.preventDefault();
    a.zoomOut();
  }
}
