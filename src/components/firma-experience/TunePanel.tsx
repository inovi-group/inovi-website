"use client";

import { useEffect, useRef, useState } from "react";
import { HERO_DEFAULTS, HERO_PARAMS, heroTune, TUNE_STORE, type HeroTune, type TuneKey } from "./heroTuning";

// Live tuning for the envelope hero (?tune=1 only). Sliders write straight into heroTune, which the scene reads
// every frame; the values are kept in this browser's localStorage and can be copied out as JSON.
function load(): Partial<HeroTune> {
  try {
    const raw = window.localStorage.getItem(TUNE_STORE);
    if (!raw) return {};
    const v = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<Record<TuneKey, unknown>> = {};
    (Object.keys(HERO_DEFAULTS) as TuneKey[]).forEach((k) => {
      if (typeof v[k] === typeof HERO_DEFAULTS[k]) out[k] = v[k];
    });
    return out as Partial<HeroTune>;
  } catch { return {}; }
}
function save(v: HeroTune) {
  try { window.localStorage.setItem(TUNE_STORE, JSON.stringify(v)); } catch { /* private mode: values just aren't kept */ }
}

const decimals = (step = 0.01) => Math.max(0, -Math.floor(Math.log10(step)));

export function TunePanel() {
  const [vals, setVals] = useState<HeroTune>({ ...heroTune });
  const [open, setOpen] = useState(true);
  const [note, setNote] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    Object.assign(heroTune, load());
    setVals({ ...heroTune });
    setOpen(window.innerWidth > 760);
  }, []);

  const set = <K extends TuneKey>(k: K, v: HeroTune[K]) => {
    heroTune[k] = v;
    const next = { ...heroTune };
    setVals(next);
    save(next);
  };
  const json = JSON.stringify(vals, null, 2);
  async function copy() {
    try { await navigator.clipboard.writeText(json); setNote("Copied"); }
    catch { box.current?.select(); setNote("Selected: press Ctrl/Cmd+C"); }
    window.setTimeout(() => setNote(""), 2200);
  }
  function reset() {
    Object.assign(heroTune, HERO_DEFAULTS);
    setVals({ ...heroTune });
    try { window.localStorage.removeItem(TUNE_STORE); } catch { /* nothing kept */ }
    setNote("Reset to defaults");
    window.setTimeout(() => setNote(""), 2200);
  }

  return (
    <aside className="tune" aria-label="Hero tuning">
      <div className="tune-head">
        <b>Hero tuning</b>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Hide" : "Show"}</button>
      </div>
      {open && (
        <div className="tune-body">
          <p className="tune-hint">Scroll to the top to see the hero. Changes apply live and are kept in this browser.</p>
          {HERO_PARAMS.map((g) => (
            <fieldset key={g.group}>
              <legend>{g.group}</legend>
              {g.items.map((p) => {
                const v = vals[p.key];
                if (typeof v === "string") {
                  return (
                    <label key={p.key} className="tune-row">
                      <span>{p.label}</span>
                      <input type="color" value={v} onChange={(e) => set(p.key, e.target.value as never)} />
                      <output>{v}</output>
                    </label>
                  );
                }
                return (
                  <label key={p.key} className="tune-row">
                    <span>{p.label}</span>
                    <input type="range" min={p.min} max={p.max} step={p.step} value={v}
                      onChange={(e) => set(p.key, Number(e.target.value) as never)} />
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
