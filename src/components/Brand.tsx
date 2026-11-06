import { Fragment, type ReactNode } from "react";

/**
 * Keeps product names in their real casing inside uppercase labels (eyebrows, mono captions): "iSale" stays iSale
 * while the rest of the label is set in capitals. Strings pass through with the name wrapped; anything else is untouched.
 */
const NAMES = /(iSale)/g;
export function brand(node: ReactNode): ReactNode {
  if (typeof node !== "string" || !node.includes("iSale")) return node;
  return node.split(NAMES).map((part, i) => (part === "iSale" ? <span key={i} className="brand-case">iSale</span> : <Fragment key={i}>{part}</Fragment>));
}
