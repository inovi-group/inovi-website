// Adds event listeners and returns one function that removes them all.
type Target = Window | Document | HTMLElement;
export function listeners() {
  const offs: (() => void)[] = [];
  const on = <E extends Event>(t: Target, type: string, fn: (e: E) => void, opts?: AddEventListenerOptions | boolean) => {
    t.addEventListener(type, fn as EventListener, opts);
    offs.push(() => t.removeEventListener(type, fn as EventListener, opts));
  };
  const off = () => offs.splice(0).forEach((f) => f());
  return { on, off };
}

export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
// top of an element in page coordinates (the site header sits above this page's content)
export const pageTop = (el: HTMLElement) => el.getBoundingClientRect().top + window.scrollY;
