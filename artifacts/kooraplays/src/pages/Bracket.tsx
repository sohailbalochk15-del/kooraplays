import { BracketTree } from "@/components/BracketTree";
import { useLang } from "@/lib/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Bracket() {
  const { t } = useLang();
  useDocumentTitle(
    "Tournament Bracket — FIFA World Cup 2026 | KooraPlays",
    "Follow the FIFA World Cup 2026 knockout bracket from round of 32 to the final."
  );
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">{t.tournamentBracket}</h1>
        <p className="text-muted-foreground">{t.bracketDesc}</p>
      </div>
      <BracketTree />
    </div>
  );
}
