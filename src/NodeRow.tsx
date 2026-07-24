import { For, Show, createSignal, createEffect } from "solid-js";
import { tree, focusId, setFocusId } from "./store";
import {
 addChild,
 addSibling,
 removeNode,
 updateText,
 updateNote,
 toggleCompleted,
 toggleCollapsed,
 zoomInto,
 moveUp,
 moveDown,
 indent,
 outdent,
} from "./actions";
import type { NodeId } from "./store";

export default function NodeRow(props: { nodeId: NodeId; depth: number }) {
 const node = () => tree()[props.nodeId];
 const [showNote, setShowNote] = createSignal(false);

 let inputRef: HTMLInputElement | undefined;

 createEffect(() => {
 if (focusId() === props.nodeId && inputRef) {
 inputRef.focus();
 const len = inputRef.value.length;
 inputRef.setSelectionRange(len, len);
 setFocusId(null);
 }
 });

 const handleKey = (e: KeyboardEvent) => {
 const t = e.currentTarget as HTMLInputElement;
 switch (e.key) {
 case "Enter":
 e.preventDefault();
 if (e.shiftKey) {
 setShowNote(true);
 } else {
 const id = addSibling(props.nodeId);
 if (id) setFocusId(id);
 }
 break;
 case "Backspace":
 if (t.value === "") {
 e.preventDefault();
 const parent = node().parentId;
 removeNode(props.nodeId);
 if (parent) setFocusId(parent);
 }
 break;
 case "Tab":
 e.preventDefault();
 if (e.shiftKey) outdent(props.nodeId);
 else indent(props.nodeId);
 break;
 case "ArrowUp":
 if (e.altKey) {
 e.preventDefault();
 moveUp(props.nodeId);
 }
 break;
 case "ArrowDown":
 if (e.altKey) {
 e.preventDefault();
 moveDown(props.nodeId);
 }
 break;
 case " ":
 if (t.selectionStart === 0 && t.selectionEnd === 0) {
 e.preventDefault();
 toggleCompleted(props.nodeId);
 }
 break;
 }
 };

 const addChildAndFocus = () => {
 const id = addChild(props.nodeId);
 toggleCollapsedAt();
 setFocusId(id);
 };

 const toggleCollapsedAt = () => {
 toggleCollapsed(props.nodeId);
 };

 return (
 <div class="group">
 <div
 class="flex items-start gap-1 py-0.5"
 style={{ "padding-left": `${props.depth * 1.25}rem` }}
 >
 <div class="relative pt-1.5 shrink-0">
 <button
 title={node().children.length ? "Zoom" : "Toggle done"}
 onClick={() =>
 node().children.length ? toggleCollapsedAt() : toggleCompleted(props.nodeId)
 }
 class="block"
 >
 <span
 class="block w-2.5 h-2.5 rounded-full border border-gray-400 hover:bg-gray-200"
 classList={{ "bg-gray-500": node().completed }}
 />
 </button>
 </div>

 <div class="flex-1">
 <input
 ref={inputRef}
 class="w-full bg-transparent outline-none py-0.5"
 classList={{
 "line-through text-gray-400": node().completed,
 "text-gray-500": !node().collapsed && node().children.length > 0,
 }}
 value={node().text}
 placeholder=" "
 onKeyDown={handleKey}
 onInput={(e) => updateText(props.nodeId, e.currentTarget.value)}
 />
 <Show when={showNote() || node().note}>
 <textarea
 class="text-xs text-gray-600 w-full bg-gray-50 rounded p-1 mt-1 outline-none resize-none"
 rows={2}
 placeholder="Node note"
 value={node().note}
 onInput={(e) => updateNote(props.nodeId, e.currentTarget.value)}
 />
 </Show>
 </div>

 <div class="pt-0.5 opacity-0 group-hover:opacity-100 transition shrink-0 flex gap-1">
 <Show when={node().children.length > 0}>
 <button
 title="Zoom in"
 class="text-xs text-gray-400 hover:text-gray-800"
 onClick={() => zoomInto(props.nodeId)}
 >
 ⊞
 </button>
 </Show>
 <button
 title="Add child"
 class="text-xs text-gray-400 hover:text-gray-800"
 onClick={addChildAndFocus}
 >
 ＋
 </button>
 <button
 title="Delete"
 class="text-xs text-gray-400 hover:text-red-600"
 onClick={() => {
 const parent = node().parentId;
 removeNode(props.nodeId);
 if (parent) setFocusId(parent);
 }}
 >
 ×
 </button>
 </div>
 </div>

 <Show when={!node().collapsed}>
 <For each={node().children}>
 {(cid) => <NodeRow nodeId={cid} depth={props.depth + 1} />}
 </For>
 </Show>
 </div>
 );
}