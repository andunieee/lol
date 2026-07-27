const COPIED = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "boxSizing",
  "wordBreak",
  "overflowWrap",
] as const;

/**
 * Whether the caret sits on the first / last *visual* line of a textarea,
 * measured on an off-screen mirror so wrapped text is handled correctly.
 */
export function caretLine(el: HTMLTextAreaElement): {
  first: boolean;
  last: boolean;
} {
  const cs = getComputedStyle(el);
  const mirror = document.createElement("div");
  for (const p of COPIED) mirror.style[p] = cs[p];
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.width = `${el.clientWidth}px`;

  const marker = document.createElement("span");
  marker.textContent = "​";
  mirror.append(
    el.value.slice(0, el.selectionStart),
    marker,
    el.value.slice(el.selectionStart),
  );
  document.body.append(mirror);

  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
  const padTop = parseFloat(cs.paddingTop) || 0;
  const padBottom = parseFloat(cs.paddingBottom) || 0;
  const top = marker.offsetTop - padTop;
  const bottom = mirror.scrollHeight - padBottom - (marker.offsetTop + lh);
  mirror.remove();

  return { first: top < lh / 2, last: bottom < lh / 2 };
}
