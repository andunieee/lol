import { For, Show, createMemo, onMount } from "solid-js";
import { tree, rootId, type Node } from "./store";
import {
 getChildIds,
 updateText,
 updateNote,
 zoomInto,
 zoomOut,
 canZoomOut,
} from "./actions";
import NodeRow from "./NodeRow";

export default function App() {
  const childIds = createMemo(() => getChildIds(rootId()));

  let titleRef: HTMLInputElement | undefined;
  onMount(() => {
    console.log("nflowy: data lives only in memory. Reload the page to reset.");
  });

  const breadcrumb = createMemo(() => {
    const parts: Node[] = [];
    let r = rootId();
    while (r !== null) {
      parts.unshift(tree()[r]);
      r = tree()[r].parentId;
    }
    return parts;
  });

  return (
    <div class="mx-auto max-w-3xl px-6 py-8 min-h-full">
      <Show
        when={rootId() === null}
        fallback={
          <div class="mb-6 flex items-center gap-2 text-sm text-gray-500">
            <Show when={canZoomOut()}>
              <button
                class="px-2 py-1 rounded hover:bg-gray-100"
                onClick={() => zoomOut()}
              >
                ← Home
              </button>
            </Show>
            <span class="text-gray-400">/</span>
            <For each={breadcrumb()}>
              {(b) => (
                <button
                  class="hover:underline"
                  onClick={() => zoomInto(b.id)}
                >
                  {b.text || "Untitled"}
                </button>
              )}
            </For>
          </div>
        }
      >
        <h1 class="text-2xl font-semibold mb-6">nflowy</h1>
        <p class="text-gray-500 mb-6">
          A Workflowy clone. Everything stays in memory — refresh to reset.
          Use <kbd class="px-1 bg-gray-100 rounded">Enter</kbd> to add items,
          <kbd class="px-1 bg-gray-100 rounded ml-1">Tab</kbd> /
          <kbd class="px-1 bg-gray-100 rounded ml-1">⇧Tab</kbd> to indent,
          <kbd class="px-1 bg-gray-100 rounded ml-1">⌫</kbd> on empty to
          delete.
        </p>
      </Show>

      <Show when={rootId() !== null}>
        <div class="mb-3">
          <input
            ref={titleRef}
            class="text-2xl font-semibold w-full bg-transparent outline-none"
            value={tree()[rootId()!].text}
            placeholder="Untitled"
            onInput={(e) => updateText(rootId()!, e.currentTarget.value)}
          />
          <textarea
            class="text-sm text-gray-600 w-full bg-transparent outline-none resize-none mt-1"
            rows={1}
            placeholder="Note"
            value={tree()[rootId()!].note}
            onInput={(e) => updateNote(rootId()!, e.currentTarget.value)}
          />
        </div>
      </Show>

      <div class="pl-2">
        <For each={childIds()}>
          {(id) => <NodeRow nodeId={id} depth={0} />}
        </For>
      </div>

      <Show when={childIds().length === 0 && rootId() !== null}>
        <p class="text-gray-400 italic mt-4">No items yet. Add one above.</p>
      </Show>
    </div>
  );
}