import { useParams, Link } from "wouter";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Tv, MapPin, Calendar } from "lucide-react";
import { useMatches } from "@/hooks/useMatches";
import { MatchCard } from "@/components/MatchCard";
import { SkeletonCard } from "@/components/SkeletonCard";
import { useLang } from "@/lib/i18n";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useStructuredData } from "@/hooks/useStructuredData";
import { Button } from "@/components/ui/button";

const SITE_URL = typeof window !== "undefined"
  ? window.location.origin
  : "https://kooraplays.vercel.app";

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: matches, isLoading, isError, refetch } = useMatches();
  const { t } = useLang();

  const match = (matches ?? []).find((m) => m.id === id);

  const title = match
    ? `${match.home_team} vs ${match.away_team} — FIFA World Cup 2026 | KooraPlays`
    : "Match — FIFA World Cup 2026 | KooraPlays";

  const description = match
    ? `Watch ${match.home_team} vs ${match.away_team} live. FIFA World Cup 2026 ${match.group ?? ""} match at ${match.venue}. Live score, updates, and streaming links.`
    : "Live FIFA World Cup 2026 match details, scores, and streaming links.";

  useDocumentTitle(title, description);

  useStructuredData(
    match
      ? {
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: `${match.home_team} vs ${match.away_team}`,
          sport: "Soccer",
          startDate: match.date,
          eventStatus:
            match.status === "FINISHED"
              ? "https://schema.org/EventCompleted"
              : match.status === "LIVE" || match.status === "HALFTIME"
              ? "https://schema.org/EventScheduled"
              : "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          location: {
            "@type": "Place",
            name: match.venue,
          },
          competitor: [
            { "@type": "SportsTeam", name: match.home_team },
            { "@type": "SportsTeam", name: match.away_team },
          ],
          description,
          url: `${SITE_URL}/match/${match.id}`,
        }
      : null,
    `match-${id}`
  );

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <SkeletonCard />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <p className="text-muted-foreground mb-4">Failed to load match.</p>
        <Button onClick={() => refetch()}>{t.retry}</Button>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        <h1 className="text-2xl font-bold mb-2">Match not found</h1>
        <p className="text-muted-foreground mb-6">This match doesn't exist or has been removed.</p>
        <Link href="/schedule">
          <Button>Back to Schedule</Button>
        </Link>
      </div>
    );
  }

  let matchDateLabel = match.date;
  try {
    matchDateLabel = format(parseISO(match.date), "EEEE, MMM d, yyyy • h:mm a");
  } catch {
    /* fallback to raw string */
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl">
      <Link href="/schedule" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to Schedule
      </Link>

      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
        {match.home_team} vs {match.away_team}
      </h1>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-6">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {matchDateLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {match.venue}
        </span>
        {match.group && <span>{match.group}</span>}
      </div>

      <MatchCard match={match} />

      {(match.status === "LIVE" || match.status === "HALFTIME") && (
        <p className="mt-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-1.5">
          <Tv className="h-4 w-4" />
          Use the Watch Now button above to stream this match live.
        </p>
      )}
    </div>
  );
}
