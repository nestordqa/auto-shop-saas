import { TERMS_SECTIONS, TERMS_VERSION } from "@/lib/terms";

/** Full Terms and Conditions text, shared by the public page and the acceptance screen. */
export function TermsContent() {
  return (
    <div className="grid gap-5 text-sm leading-6 text-stone-700">
      {TERMS_SECTIONS.map((section) => (
        <section key={section.title}>
          <h2 className="font-bold text-stone-950">{section.title}</h2>
          {section.body.map((paragraph) => <p key={paragraph.slice(0, 40)} className="mt-1.5">{paragraph}</p>)}
        </section>
      ))}
      <p className="text-xs text-stone-500">Versión {TERMS_VERSION}</p>
    </div>
  );
}
