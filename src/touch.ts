import { createSignal } from "solid-js";

const coarse = window.matchMedia("(pointer: coarse)");
const detect = () => coarse.matches || navigator.maxTouchPoints > 0;

const [isTouch, setIsTouch] = createSignal(detect());
coarse.addEventListener("change", () => setIsTouch(detect()));

export { isTouch };
