import { useLang } from "@/lib/i18n";

export function BracketTree() {
  const { t } = useLang();
  return (
    <div className="w-full overflow-x-auto py-10 px-4 min-h-[600px] bg-card rounded-xl border border-border flex items-center justify-center">
      <div className="text-center text-muted-foreground flex flex-col items-center">
        <div className="mb-6 p-4 rounded-full bg-primary/10 text-primary inline-flex">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
            <path d="M4 22h16"/>
            <path d="M10 14.66V17c0 5.5-3.6 6.3-6 9h16c-2.4-2.7-6-3.5-6-9v-2.34"/>
            <path d="M11 2.5a2.5 2.5 0 1 0 2 0"/>
            <path d="M8 9h8a2 2 0 0 0 2-2V4H6v3a2 2 0 0 0 2 2z"/>
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2 text-foreground">{t.knockoutTBD}</h2>
        <p className="max-w-md mx-auto">{t.knockoutTBDDesc}</p>
      </div>
    </div>
  );
}
