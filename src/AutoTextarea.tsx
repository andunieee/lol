import { createEffect, onCleanup, onMount } from "solid-js";
import { focusReq, setFocusReq, type NodeId } from "./store";

/**
 * A borderless textarea that grows with its content and claims focus
 * requests addressed to (nodeId, field).
 */
export default function AutoTextarea(props: {
  nodeId: NodeId;
  field: "text" | "note";
  value: string;
  class?: string;
  placeholder?: string;
  onInput: (value: string) => void;
  onKeyDown: (e: KeyboardEvent) => void;
  onPaste?: (e: ClipboardEvent) => void;
  onBlur?: () => void;
}) {
  let el!: HTMLTextAreaElement;

  const fit = () => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  // Only touch the DOM value when it differs, so typing never disturbs the caret.
  createEffect(() => {
    const v = props.value;
    if (el.value !== v) el.value = v;
    fit();
  });

  createEffect(() => {
    const r = focusReq();
    if (!r || r.id !== props.nodeId || r.field !== props.field) return;
    setFocusReq(null);
    if (el.value !== props.value) el.value = props.value;
    const len = el.value.length;
    const pos =
      r.caret === "start" ? 0 : r.caret === "end" ? len : Math.min(r.caret, len);
    el.focus({ preventScroll: true });
    el.setSelectionRange(pos, pos);
    fit();
    el.scrollIntoView({ block: "nearest" });
  });

  onMount(() => {
    let width = el.offsetWidth;
    const ro = new ResizeObserver(() => {
      if (el.offsetWidth !== width) {
        width = el.offsetWidth;
        fit();
      }
    });
    ro.observe(el);
    onCleanup(() => ro.disconnect());
  });

  return (
    <textarea
      ref={el}
      rows={1}
      spellcheck={false}
      class={`block w-full resize-none overflow-hidden bg-transparent outline-none ${props.class ?? ""}`}
      placeholder={props.placeholder}
      onInput={(e) => {
        props.onInput(e.currentTarget.value);
        fit();
      }}
      onKeyDown={props.onKeyDown}
      onPaste={props.onPaste}
      onBlur={props.onBlur}
    />
  );
}
