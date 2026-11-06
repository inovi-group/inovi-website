import Link from "next/link";
import { DEMO, href, MAIL, SPEC, type Lang } from "@/i18n";
import { ui } from "@/i18n/ui";

export function Footer({ lang }: { lang: Lang }) {
  const t = ui(lang).footer;
  const col = "text-xs font-semibold uppercase tracking-[0.12em] text-dim";
  const link = "text-muted hover:text-text";
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold tracking-tight text-text">INOVI</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">Group</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{t.blurb}</p>
        </div>

        <div>
          <div className={col}>{t.products}</div>
          <ul className="mt-3 space-y-2.5 text-sm">
            <li><Link href={href(lang, "isale")} className={link}>{t.isale}</Link></li>
            <li><Link href={href(lang, "agro")} className={link}>{t.agro}</Link></li>
          </ul>
        </div>

        <div>
          <div className={col}>{t.platform}</div>
          <ul className="mt-3 space-y-2.5 text-sm">
            <li><Link href={href(lang, "firma")} className={link}>{t.firma}</Link></li>
            <li><a href={SPEC} target="_blank" rel="noopener noreferrer" className={link}>{t.spec}</a></li>
            <li><a href={DEMO} target="_blank" rel="noopener noreferrer" className={link}>{t.demo}</a></li>
          </ul>
        </div>

        <div>
          <div className={col}>{t.company}</div>
          <ul className="mt-3 space-y-2.5 text-sm">
            <li><Link href={href(lang, "about")} className={link}>{t.about}</Link></li>
            <li><a href={`mailto:${MAIL}`} className={link}>{MAIL}</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-xs text-dim sm:flex-row sm:items-center sm:justify-between">
          <span>{t.rights}</span>
          <span>{t.licence}</span>
        </div>
      </div>
    </footer>
  );
}
