/**
 * Minimal DOM builder. Text always goes in as text nodes: candidate names
 * and other data never reach innerHTML.
 */

export type Child = Node | string | number | null | undefined | false;

interface Props {
  class?: string;
  attrs?: Record<string, string>;
  on?: Partial<Record<keyof HTMLElementEventMap, (event: Event) => void>>;
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (props?.class) element.className = props.class;
  for (const [name, value] of Object.entries(props?.attrs ?? {})) {
    element.setAttribute(name, value);
  }
  for (const [type, handler] of Object.entries(props?.on ?? {})) {
    if (handler) element.addEventListener(type, handler);
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    element.append(
      child instanceof Node ? child : document.createTextNode(String(child)),
    );
  }
  return element;
}
