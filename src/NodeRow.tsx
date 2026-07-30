import { For, Show } from "solid-js";
import {
  tree,
  openNoteId,
  setOpenNoteId,
  dragId,
  setDragId,
  dropTarget,
  setDropTarget,
  selecting,
  selected,
  type NodeId,
} from "./store";
import {
  updateText,
  updateNote,
  setCollapsed,
  zoomInto,
  isDescendant,
  dropNode,
  endDrag,
  toggleSelected,
} from "./actions";
import { isTouch } from "./touch";
import { textKeyDown, textPaste, noteKeyDown } from "./keys";
import AutoTextarea from "./AutoTextarea";

export default function NodeRow(props: { nodeId: NodeId }) {
  const node = () => tree[props.nodeId];
  const hasChildren = () => node().children.length > 0;
  const expanded = () => hasChildren() && !node().collapsed;
  const drop = () => {
    const d = dropTarget();
    return d && d.id === props.nodeId ? d.pos : null;
  };

  let row!: HTMLDivElement;

  const onDragOver = (e: DragEvent) => {
    const dragged = dragId();
    if (!dragged) return;
    if (dragged === props.nodeId || isDescendant(props.nodeId, dragged)) {
      setDropTarget(null);
      return;
    }
    e.preventDefault();
    const r = row.getBoundingClientRect();
    const upper = e.clientY - r.top < r.height / 2;
    // Dragging to the right of the bullet nests; so does the lower half of an open parent.
    const nest = !upper && (e.clientX - r.left > 44 || expanded());
    setDropTarget({
      id: props.nodeId,
      pos: upper ? "before" : nest ? "child" : "after",
    });
  };

  return (
    <div class={dragId() === props.nodeId ? "opacity-40" : ""}>
      <div
        ref={row}
        class="group relative flex items-start rounded"
        classList={{ "bg-blue-100": selected().includes(props.nodeId) }}
        onDragOver={onDragOver}
        onDrop={(e) => {
          const dragged = dragId();
          const d = dropTarget();
          if (!dragged || !d) return;
          e.preventDefault();
          dropNode(dragged, d.id, d.pos);
        }}
      >
        <Show when={hasChildren()}>
          <button
            tabindex={-1}
            title={node().collapsed ? "Expand" : "Collapse"}
            class="absolute -left-5 top-0 flex h-7 w-5 items-center justify-center text-gray-400 transition-opacity hover:text-gray-700"
            classList={{ "opacity-0 group-hover:opacity-100": !isTouch() }}
            onClick={() => setCollapsed(props.nodeId, !node().collapsed)}
          >
            <svg
              viewBox="0 0 10 10"
              class="h-2.5 w-2.5 transition-transform duration-150"
              classList={{ "rotate-90": !node().collapsed }}
            >
              <path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" />
            </svg>
          </button>
        </Show>

        <div
          draggable={true}
          title="Click to zoom, drag to move"
          class="flex h-7 w-5 shrink-0 cursor-pointer items-center justify-center"
          onClick={() => zoomInto(props.nodeId)}
          onDragStart={(e) => {
            e.dataTransfer!.effectAllowed = "move";
            e.dataTransfer!.setData("text/plain", props.nodeId);
            e.dataTransfer!.setDragImage(row, 0, 0);
            setDragId(props.nodeId);
          }}
          onDragEnd={endDrag}
        >
          <span
            class="flex h-[18px] w-[18px] items-center justify-center rounded-full transition-colors hover:bg-gray-200"
            classList={{ "bg-gray-200": node().collapsed && hasChildren() }}
          >
            <span
              class="h-[6px] w-[6px] rounded-full transition-transform group-hover:scale-125"
              classList={{
                "bg-gray-500": !node().completed,
                "bg-gray-300": node().completed,
              }}
            />
          </span>
        </div>

        <div class="min-w-0 flex-1">
          <AutoTextarea
            nodeId={props.nodeId}
            field="text"
            value={node().text}
            class={`py-0 text-[15px] leading-7 ${node().completed ? "text-gray-400 line-through" : ""}`}
            onInput={(v) => updateText(props.nodeId, v)}
            onKeyDown={(e) => textKeyDown(props.nodeId, e)}
            onPaste={(e) => textPaste(props.nodeId, e)}
          />
          <Show when={node().note !== "" || openNoteId() === props.nodeId}>
            <AutoTextarea
              nodeId={props.nodeId}
              field="note"
              value={node().note}
              class="pb-1 text-sm leading-5 text-gray-500"
              placeholder="Add a description"
              onInput={(v) => updateNote(props.nodeId, v)}
              onKeyDown={(e) => noteKeyDown(props.nodeId, e)}
              onBlur={() => {
                if (node()?.note === "" && openNoteId() === props.nodeId)
                  setOpenNoteId(null);
              }}
            />
          </Show>
        </div>

        {/* In select mode the whole row is one tap target. */}
        <Show when={selecting()}>
          <div
            class="absolute inset-0 z-10"
            onClick={() => toggleSelected(props.nodeId)}
          />
        </Show>

        <Show when={drop()}>
          {(pos) => (
            <div
              class="pointer-events-none absolute right-0 h-0.5 rounded bg-blue-500"
              classList={{
                "top-0": pos() === "before",
                "bottom-0": pos() !== "before",
              }}
              style={{ left: pos() === "child" ? "2.75rem" : "1.25rem" }}
            />
          )}
        </Show>
      </div>

      <Show when={expanded()}>
        <div class="ml-[9px] border-l border-gray-200 pl-[10px]">
          <For each={node().children}>{(cid) => <NodeRow nodeId={cid} />}</For>
        </div>
      </Show>
    </div>
  );
}
