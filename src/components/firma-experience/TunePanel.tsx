"use client";

import { useEffect, useRef, useState } from "react";
import { HERO_DEFAULTS, HERO_PARAMS, heroTune, TUNE_STORE } from "./heroTuning";

// Live tuning for a 3D scene (?tune=1 only). Sliders write straight into the live values object, which the
// scene reads every frame; the values are kept in this browser's localStorage and can be copied out as JSON.
// With no props it tunes the Firma envelope hero; other pages pass their own defaults, groups and store key.
type Values = Record<string, number | string>;
type Group = { group: string; items: { key: string; label: string; min?: number; max?: number; step?: number }[] };
type Props = { defaults?: Values; params?: Group[]; live?: Values; store?: string; title?: string; hint?: string };

function load(defaults: Values, store: string): Values {
  try {
    const raw = window.localStorage.getItem(store);
    if (!raw) return {};
    const v = JSON.parse(raw) as Record<string, unknown>;
    const out: Values = {};
    Object.keys(defaults).forEach((k) => {
      if (typeof v[k] === typeof defaults[k]) out[k] = v[k] as number | string;
    });
    return out;
  } catch { return {}; }
}
function save(v: Values, store: string) {
  try { window.localStorage.setItem(store, JSON.stringify(v)); } catch { /* private mode: values just aren't kept */ }
}

const decimals = (step = 0.01) => Math.max(0, -Math.floor(Math.log10(step)));

export function TunePanel({
  defaults = HERO_DEFAULTS as Values, params = HERO_PARAMS as Group[], live = heroTune as Values, store = TUNE_STORE,
  title = "Hero tuning", hint = "Scroll to the top to see the hero. Changes apply live and are kept in this browser.",
}: Props) {
  const [vals, setVals] = useState<Values>({ ...live });
  const [open, setOpen] = useState(true);
  const [note, setNote] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    Object.assign(live, load(defaults, store));
    setVals({ ...live });
    setOpen(window.innerWidth > 760);
  }, [defaults, live, store]);

  const set = (k: string, v: number | string) => {
    live[k] = v;
    const next = { ...live };
    setVals(next);
    save(next, store);
  };
  const json = JSON.stringify(vals, null, 2);
  async function copy() {
    try { await navigator.clipboard.writeText(json); setNote("Copied"); }
    catch { box.current?.select(); setNote("Selected: press Ctrl/Cmd+C"); }
    window.setTimeout(() => setNote(""), 2200);
  }
  function reset() {
    Object.assign(live, defaults);
    setVals({ ...live });
    try { window.localStorage.removeItem(store); } catch { /* nothing kept */ }
    setNote("Reset to defaults");
    window.setTimeout(() => setNote(""), 2200);
  }

  return (
    <aside className="tune" aria-label={title}>
      <div className="tune-head">
        <b>{title}</b>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Hide" : "Show"}</button>
      </div>
      {open && (
        <div className="tune-body">
          <p className="tune-hint">{hint}</p>
          {params.map((g) => (
            <fieldset key={g.group}>
              <legend>{g.group}</legend>
              {g.items.map((p) => {
                const v = vals[p.key];
                if (typeof v === "string") {
                  return (
                    <label key={p.key} className="tune-row">
                      <span>{p.label}</span>
                      <input type="color" value={v} onChange={(e) => set(p.key, e.target.value)} />
                      <output>{v}</output>
                    </label>
                  );
                }
                return (
                  <label key={p.key} className="tune-row">
                    <span>{p.label}</span>
                    <input type="range" min={p.min} max={p.max} step={p.step} value={v}
                      onChange={(e) => set(p.key, Number(e.target.value))} />
                    <output>{v.toFixed(decimals(p.step))}</output>
                  </label>
                );
              })}
            </fieldset>
          ))}
          <div className="tune-actions">
            <button type="button" onClick={copy}>Copy values</button>
            <button type="button" onClick={reset}>Reset to defaults</button>
            <span role="status">{note}</span>
          </div>
          <textarea ref={box} readOnly value={json} rows={8} aria-label="Current values as JSON" onFocus={(e) => e.target.select()} />
        </div>
      )}
    </aside>
  );
}
