import { For, createSignal, onCleanup, onMount, type JSX } from "solid-js";
import {
  tree,
  rootId,
  active,
  selecting,
  setSelecting,
  selected,
  setSelected,
  setOpenNoteId,
  requestFocus,
  type NodeId,
} from "./store";
import { shiftMany, indentMany, outdentMany, visibleOrder } from "./actions";

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d={d} />
  </svg>
);

/** Bottom control bar for touch devices, where Tab/Shift/Ctrl don't exist. */
export default function TouchBar() {
  // Keep the bar above the on-screen keyboard.
  const [offset, setOffset] = createSignal(0);
  onMount(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () =>
      setOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    onCleanup(() => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    });
  });

  const editing = () => {
    const a = active();
    return a && tree[a.id] && visibleOrder().includes(a.id) ? a : null;
  };

  /** Selected items in select mode, otherwise the item being edited. */
  const targets = (): NodeId[] => {
    if (selecting()) return selected().filter((id) => tree[id]);
    const a = editing();
    return a && a.id !== rootId() ? [a.id] : [];
  };

  const move = (fn: (ids: NodeId[]) => void) => {
    const ids = targets();
    if (!ids.length) return;
    const el = document.activeElement;
    const a = editing();
    fn(ids);
    // Moving DOM nodes drops focus; restore it only if the keyboard was up.
    if (!selecting() && a && el instanceof HTMLTextAreaElement)
      requestFocus(a.id, a.field, el.selectionStart);
  };

  const toggleNote = () => {
    const a = editing();
    if (!a) return;
    if (a.field === "note") return requestFocus(a.id, "text", "end");
    if (a.id !== rootId()) setOpenNoteId(a.id);
    requestFocus(a.id, "note", "end");
  };

  const toggleSelecting = () => {
    if (selecting()) {
      setSelecting(false);
      setSelected([]);
      return;
    }
    const a = editing();
    setSelected(a && a.id !== rootId() ? [a.id] : []);
    (document.activeElement as HTMLElement | null)?.blur();
    setSelecting(true);
  };

  const buttons: {
    label: () => string;
    icon: JSX.Element;
    run: () => void;
    disabled: () => boolean;
    on?: () => boolean;
  }[] = [
    {
      label: () => "Note",
      icon: icon("M4 6h16M4 12h16M4 18h10"),
      run: toggleNote,
      disabled: () => selecting() || !editing(),
    },
    {
      label: () => (selecting() ? `Done (${selected().length})` : "Select"),
      icon: icon("M9 11l3 3 8-8M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"),
      run: toggleSelecting,
      disabled: () => false,
      on: selecting,
    },
    {
      label: () => "Back",
      icon: icon("M11 17l-5-5 5-5M18 17l-5-5 5-5"),
      run: () => move(outdentMany),
      disabled: () => !targets().length,
    },
    {
      label: () => "Up",
      icon: icon("M12 19V5M5 12l7-7 7 7"),
      run: () => move((ids) => shiftMany(ids, -1)),
      disabled: () => !targets().length,
    },
    {
      label: () => "Down",
      icon: icon("M12 5v14M19 12l-7 7-7-7"),
      run: () => move((ids) => shiftMany(ids, 1)),
      disabled: () => !targets().length,
    },
    {
      label: () => "Front",
      icon: icon("M13 17l5-5-5-5M6 17l5-5-5-5"),
      run: () => move(indentMany),
      disabled: () => !targets().length,
    },
  ];

  return (
    <div
      class="fixed inset-x-0 z-20 border-t border-gray-200 bg-white/95 backdrop-blur"
      style={{
        bottom: `${offset()}px`,
        "padding-bottom": offset() ? "0" : "env(safe-area-inset-bottom)",
      }}
    >
      <div class="mx-auto flex max-w-3xl">
        <For each={buttons}>
          {(b) => (
            <button
              type="button"
              class="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-gray-600 active:bg-gray-100 disabled:text-gray-300"
              classList={{ "text-blue-600": b.on?.() }}
              disabled={b.disabled()}
              // Keep the textarea focused (and the keyboard up) while tapping.
              onPointerDown={(e) => e.preventDefault()}
              onClick={b.run}
            >
              {b.icon}
              <span class="truncate">{b.label()}</span>
            </button>
          )}
        </For>
      </div>
    </div>
  );
}
