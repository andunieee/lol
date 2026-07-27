import { For, Show, createMemo, onCleanup, onMount } from "solid-js";
import { tree, rootId, requestFocus, ROOT } from "./store";
import {
  updateText,
  updateNote,
  zoomTo,
  zoomOut,
  endDrag,
  visibleOrder,
} from "./actions";
import { titleKeyDown, noteKeyDown } from "./keys";
import AutoTextarea from "./AutoTextarea";
import NodeRow from "./NodeRow";

export default function App() {
  const childIds = createMemo(() => tree[rootId()].children);
  const zoomed = () => rootId() !== ROOT;

  const breadcrumb = createMemo(() => {
    const parts = [];
    let r: string | null = rootId();
    while (r !== null && r !== ROOT) {
      parts.unshift(tree[r]);
      r = tree[r].parentId;
    }
    return parts;
  });

  onMount(() => {
    zoomTo(ROOT);
    // A drop onto a re-created row never gets its own dragend.
    window.addEventListener("drop", endDrag);
    window.addEventListener("dragend", endDrag);
    onCleanup(() => {
      window.removeEventListener("drop", endDrag);
      window.removeEventListener("dragend", endDrag);
    });
  });

  const focusEnd = () => {
    const last = visibleOrder().at(-1);
    if (last) requestFocus(last, "text", "end");
  };

  return (
    <div class="mx-auto min-h-full max-w-3xl px-6 pb-24 pt-10">
      <Show
        when={zoomed()}
        fallback={<h1 class="mb-5 pl-5 text-2xl font-semibold">nflowy</h1>}
      >
        <nav class="mb-4 flex flex-wrap items-center gap-1 pl-5 text-sm text-gray-500">
          <button class="rounded px-1.5 py-0.5 hover:bg-gray-100" onClick={() => zoomTo(ROOT)}>
            Home
          </button>
          <For each={breadcrumb().slice(0, -1)}>
            {(b) => (
              <>
                <span class="text-gray-300">/</span>
                <button class="rounded px-1.5 py-0.5 hover:bg-gray-100" onClick={() => zoomTo(b.id)}>
                  {b.text || "Untitled"}
                </button>
              </>
            )}
          </For>
          <button class="ml-auto rounded px-1.5 py-0.5 hover:bg-gray-100" onClick={zoomOut}>
            ↑ Up
          </button>
        </nav>

        <div class="mb-3 pl-5">
          <AutoTextarea
            nodeId={rootId()}
            field="text"
            value={tree[rootId()].text}
            class="text-3xl font-bold leading-tight"
            placeholder="Untitled"
            onInput={(v) => updateText(rootId(), v)}
            onKeyDown={(e) => titleKeyDown(rootId(), e)}
          />
          <AutoTextarea
            nodeId={rootId()}
            field="note"
            value={tree[rootId()].note}
            class="mt-1 text-sm leading-5 text-gray-500"
            placeholder="Add a description"
            onInput={(v) => updateNote(rootId(), v)}
            onKeyDown={(e) => noteKeyDown(rootId(), e)}
          />
        </div>
      </Show>

      <div class="pl-5">
        <For each={childIds()}>{(id) => <NodeRow nodeId={id} />}</For>
      </div>

      {/* Clicking the empty space below the list continues the last item. */}
      <div class="min-h-[40vh] cursor-text" onClick={focusEnd} />

      <p class="mt-8 pl-5 text-xs leading-6 text-gray-400">
        Enter new item · Tab / ⇧Tab indent · ⇧Enter description · ⌘/Ctrl+Enter complete ·
        ⌘/Ctrl+↑↓ collapse / expand · ⌘/Ctrl+⇧+↑↓ move · Alt+→ / Alt+← zoom · drag bullets to reorder
      </p>
    </div>
  );
}
