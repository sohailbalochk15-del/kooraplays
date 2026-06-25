import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ar";

export const translations = {
  en: {
    home: "Home",
    schedule: "Schedule",
    standings: "Standings",
    bracket: "Bracket",
    liveTV: "LIVE TV",
    live: "LIVE",

    officialBroadcaster: "Official Broadcaster",
    heroTitle: "Watch FIFA World Cup",
    heroTitleYear: "2026",
    heroTitleSuffix: "Live",
    heroDesc: "Real-time scores, immersive streaming, and deep analytics. The stadium experience, anywhere.",
    startWatching: "Start Watching",
    fullSchedule: "Full Schedule",
    todaysMatches: "Today's Matches",
    viewAll: "View All",
    noMatchesToday: "No matches today",
    noMatchesTodayDesc: "Check the full schedule for upcoming fixtures.",
    viewSchedule: "View Schedule",
    failedMatchData: "Failed to load match data.",
    retry: "Retry",

    matchSchedule: "Match Schedule",
    allTimesIn: "All times in",
    searchTeams: "Search teams...",
    all: "All",
    groupStage: "Group Stage",
    knockoutStage: "Knockout Stage",
    noMatchesFound: "No matches found matching your criteria.",
    failedSchedule: "Failed to load schedule.",
    group: "Group",

    groupStandings: "Group Standings",
    standingsDesc: "Top two teams from each group and eight best third-placed teams advance to the Round of 32.",
    advance: "Advance",
    possibleAdvance: "Possible Advance",
    failedStandings: "Failed to load standings.",
    noStandingsData: "No standings data available yet.",
    team: "Team",
    pts: "Pts",

    tournamentBracket: "Tournament Bracket",
    bracketDesc: "Follow the path to the finals. 32 teams, 1 champion.",
    knockoutTBD: "Knockout Stage TBD",
    knockoutTBDDesc: "The bracket will be revealed once the group stages conclude and the final 32 teams are determined.",

    connectingStream: "Connecting to stream\u2026",
    streamUnavailable: "Stream unavailable",
    broadcastEnded: "The broadcast may have ended or moved.",
    noStream: "No stream configured",
    noStreamDesc: "Update the stream URL in your Supabase dashboard.",
    mute: "Mute",
    unmute: "Unmute",
    fullscreen: "Fullscreen",
    exitFullscreen: "Exit",

    upcoming: "UPCOMING",
    ft: "FT",
    started: "Started",

    upcomingMatches: "Upcoming Matches",
    upcomingMatchesDesc: "Next fixtures — times in your local timezone",
    noUpcoming: "No upcoming matches",
    noUpcomingDesc: "All matches have been played.",
    viewMoreUpcoming: "View Full Schedule",

    shop: "Shop",
    vote: "Vote",
    predictResult: "Predict the Result",
    livePredictions: "Live Predictions",
    watchNow: "Watch Now",
    halfTime: "Half Time",
    days: "d",
    hours: "h",
    minutes: "m",
    seconds: "s",
    draw: "Draw",

    voteTitle: "Who Will Win the",
    voteTitleHighlight: "World Cup?",
    voteSubtitle: "Cast your vote for the team you think will lift the trophy. One vote per device.",
    voteTotalVotes: "total votes",
    voteYouVoted: "You voted!",
    voteByVotes: "By Votes",
    voteAZ: "A – Z",
    voteLeading: "Leading",
    voteCountedMsg: "Vote Counted!",
    voteTapHint: "Tap a team to cast your vote — one vote per device",
    voteAlreadyVoted: "You have already voted!",
    voteErrorMsg: "Vote error",
    voteRetryHint: "Please refresh the page and try again.",
    voteNotConfigured: "Vote system not configured.",
    voteTeamsRealtime: "teams • Real-time updates",
    voteGroupLabel: "Group",
  },

  ar: {
    home: "\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629",
    schedule: "\u0627\u0644\u062c\u062f\u0648\u0644",
    standings: "\u0627\u0644\u062a\u0631\u062a\u064a\u0628",
    bracket: "\u0627\u0644\u0625\u0642\u0635\u0627\u0626\u064a",
    liveTV: "\u0628\u062b \u0645\u0628\u0627\u0634\u0631",
    live: "\u0645\u0628\u0627\u0634\u0631",

    officialBroadcaster: "\u0627\u0644\u0646\u0627\u0642\u0644 \u0627\u0644\u0631\u0633\u0645\u064a",
    heroTitle: "\u0634\u0627\u0647\u062f \u0643\u0623\u0633 \u0627\u0644\u0639\u0627\u0644\u0645 FIFA",
    heroTitleYear: "2026",
    heroTitleSuffix: "\u0645\u0628\u0627\u0634\u0631\u0629\u064b",
    heroDesc: "\u0646\u062a\u0627\u0626\u062c \u0641\u0648\u0631\u064a\u0629\u060c \u0628\u062b \u0645\u0645\u064a\u0632\u060c \u0648\u062a\u062d\u0644\u064a\u0644\u0627\u062a \u0639\u0645\u064a\u0642\u0629. \u062a\u062c\u0631\u0628\u0629 \u0627\u0644\u0645\u0644\u0639\u0628 \u0641\u064a \u0623\u064a \u0645\u0643\u0627\u0646.",
    startWatching: "\u0627\u0628\u062f\u0623 \u0627\u0644\u0645\u0634\u0627\u0647\u062f\u0629",
    fullSchedule: "\u0627\u0644\u062c\u062f\u0648\u0644 \u0627\u0644\u0643\u0627\u0645\u0644",
    todaysMatches: "\u0645\u0628\u0627\u0631\u064a\u0627\u062a \u0627\u0644\u064a\u0648\u0645",
    viewAll: "\u0639\u0631\u0636 \u0627\u0644\u0643\u0644",
    noMatchesToday: "\u0644\u0627 \u0645\u0628\u0627\u0631\u064a\u0627\u062a \u0627\u0644\u064a\u0648\u0645",
    noMatchesTodayDesc: "\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u062c\u062f\u0648\u0644 \u0627\u0644\u0643\u0627\u0645\u0644 \u0644\u0644\u0645\u0628\u0627\u0631\u064a\u0627\u062a \u0627\u0644\u0642\u0627\u062f\u0645\u0629.",
    viewSchedule: "\u0639\u0631\u0636 \u0627\u0644\u062c\u062f\u0648\u0644",
    failedMatchData: "\u0641\u0634\u0644 \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0628\u0627\u0631\u0627\u0629.",
    retry: "\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629",

    matchSchedule: "\u062c\u062f\u0648\u0644 \u0627\u0644\u0645\u0628\u0627\u0631\u064a\u0627\u062a",
    allTimesIn: "\u0627\u0644\u062a\u0648\u0642\u064a\u062a \u062d\u0633\u0628",
    searchTeams: "\u0628\u062d\u062b \u0639\u0646 \u0641\u0631\u0642...",
    all: "\u0627\u0644\u0643\u0644",
    groupStage: "\u062f\u0648\u0631 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0627\u062a",
    knockoutStage: "\u0627\u0644\u062f\u0648\u0631 \u0627\u0644\u0625\u0642\u0635\u0627\u0626\u064a",
    noMatchesFound: "\u0644\u0627 \u0645\u0628\u0627\u0631\u064a\u0627\u062a \u062a\u0637\u0627\u0628\u0642 \u0645\u0639\u0627\u064a\u064a\u0631\u0643.",
    failedSchedule: "\u0641\u0634\u0644 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062c\u062f\u0648\u0644.",
    group: "\u0645\u062c\u0645\u0648\u0639\u0629",

    groupStandings: "\u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0627\u062a",
    standingsDesc: "\u0623\u0641\u0636\u0644 \u0641\u0631\u064a\u0642\u064a\u0646 \u0645\u0646 \u0643\u0644 \u0645\u062c\u0645\u0648\u0639\u0629 \u0648\u0623\u0641\u0636\u0644 \u062b\u0645\u0627\u0646\u064a\u0629 \u0641\u0631\u0642 \u062b\u0627\u0644\u062b\u0629 \u062a\u062a\u0623\u0647\u0644 \u0625\u0644\u0649 \u062f\u0648\u0631 \u0627\u0644\u0640\u0663\u0662.",
    advance: "\u0645\u062a\u0623\u0647\u0644",
    possibleAdvance: "\u0627\u062d\u062a\u0645\u0627\u0644 \u0627\u0644\u062a\u0623\u0647\u0644",
    failedStandings: "\u0641\u0634\u0644 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062a\u0631\u062a\u064a\u0628.",
    noStandingsData: "\u0644\u0627 \u0628\u064a\u0627\u0646\u0627\u062a \u062a\u0631\u062a\u064a\u0628 \u0645\u062a\u0627\u062d\u0629 \u0628\u0639\u062f.",
    team: "\u0627\u0644\u0641\u0631\u064a\u0642",
    pts: "\u0646\u0642\u0627\u0637",

    tournamentBracket: "\u062c\u062f\u0648\u0644 \u0627\u0644\u0628\u0637\u0648\u0644\u0629",
    bracketDesc: "\u062a\u062a\u0628\u0639 \u0627\u0644\u0645\u0633\u0627\u0631 \u0646\u062d\u0648 \u0627\u0644\u0646\u0647\u0627\u0626\u064a. 32 \u0641\u0631\u064a\u0642\u064b\u0627\u060c \u0628\u0637\u0644 \u0648\u0627\u062d\u062f.",
    knockoutTBD: "\u0627\u0644\u062f\u0648\u0631 \u0627\u0644\u0625\u0642\u0635\u0627\u0626\u064a \u0642\u064a\u062f \u0627\u0644\u062a\u062d\u062f\u064a\u062f",
    knockoutTBDDesc: "\u0633\u064a\u062a\u0645 \u0627\u0644\u0643\u0634\u0641 \u0639\u0646 \u0627\u0644\u062f\u0648\u0631 \u0627\u0644\u0625\u0642\u0635\u0627\u0626\u064a \u0628\u0639\u062f \u0627\u0646\u062a\u0647\u0627\u0621 \u062f\u0648\u0631 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0627\u062a \u0648\u062a\u062d\u062f\u064a\u062f \u0627\u0644\u0641\u0631\u0642 \u0627\u0644\u0640\u0663\u0662 \u0627\u0644\u0646\u0647\u0627\u0626\u064a\u0629.",

    connectingStream: "\u062c\u0627\u0631\u064d \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u0628\u062b...",
    streamUnavailable: "\u0627\u0644\u0628\u062b \u063a\u064a\u0631 \u0645\u062a\u0627\u062d",
    broadcastEnded: "\u0642\u062f \u064a\u0643\u0648\u0646 \u0627\u0644\u0628\u062b \u0642\u062f \u0627\u0646\u062a\u0647\u0649 \u0623\u0648 \u062a\u063a\u064a\u0631.",
    noStream: "\u0644\u0645 \u064a\u062a\u0645 \u062a\u0643\u0648\u064a\u0646 \u0628\u062b",
    noStreamDesc: "\u0642\u0645 \u0628\u062a\u062d\u062f\u064a\u062b \u0631\u0627\u0628\u0637 \u0627\u0644\u0628\u062b \u0641\u064a \u0644\u0648\u062d\u0629 \u062a\u062d\u0643\u0645 Supabase.",
    mute: "\u0643\u062a\u0645",
    unmute: "\u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u0643\u062a\u0645",
    fullscreen: "\u0645\u0644\u0621 \u0627\u0644\u0634\u0627\u0634\u0629",
    exitFullscreen: "\u062e\u0631\u0648\u062c",

    upcoming: "\u0642\u0627\u062f\u0645\u0629",
    ft: "\u0646\u0647\u0627\u064a\u0629",
    started: "\u0628\u062f\u0623\u062a",

    upcomingMatches: "\u0627\u0644\u0645\u0628\u0627\u0631\u064a\u0627\u062a \u0627\u0644\u0642\u0627\u062f\u0645\u0629",
    upcomingMatchesDesc: "\u0627\u0644\u0645\u0628\u0627\u0631\u064a\u0627\u062a \u0627\u0644\u062a\u0627\u0644\u064a\u0629 \u2014 \u0627\u0644\u0623\u0648\u0642\u0627\u062a \u0628\u062a\u0648\u0642\u064a\u062a\u0643 \u0627\u0644\u0645\u062d\u0644\u064a",
    noUpcoming: "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0628\u0627\u0631\u064a\u0627\u062a \u0642\u0627\u062f\u0645\u0629",
    noUpcomingDesc: "\u062a\u0645 \u0644\u0639\u0628 \u062c\u0645\u064a\u0639 \u0627\u0644\u0645\u0628\u0627\u0631\u064a\u0627\u062a.",
    viewMoreUpcoming: "\u0627\u0644\u062c\u062f\u0648\u0644 \u0627\u0644\u0643\u0627\u0645\u0644",

    shop: "\u0627\u0644\u0645\u062a\u062c\u0631",
    vote: "\u062a\u0635\u0648\u064a\u062a",
    predictResult: "\u062a\u0648\u0642\u0639 \u0627\u0644\u0646\u062a\u064a\u062c\u0629",
    livePredictions: "\u062a\u0648\u0642\u0639\u0627\u062a \u0645\u0628\u0627\u0634\u0631\u0629",
    watchNow: "\u0634\u0627\u0647\u062f \u0627\u0644\u0622\u0646",
    halfTime: "\u0627\u0633\u062a\u0631\u0627\u062d\u0629",
    days: "\u064a",
    hours: "\u0633",
    minutes: "\u062f",
    seconds: "\u062b",
    draw: "\u062a\u0639\u0627\u062f\u0644",

    voteTitle: "\u0645\u0646 \u0633\u064a\u0641\u0648\u0632 \u0628",
    voteTitleHighlight: "\u0643\u0623\u0633 \u0627\u0644\u0639\u0627\u0644\u0645\u061f",
    voteSubtitle: "\u0635\u0648\u062a \u0644\u0644\u0641\u0631\u064a\u0642 \u0627\u0644\u0630\u064a \u062a\u0638\u0646 \u0623\u0646\u0647 \u0633\u064a\u0631\u0641\u0639 \u0627\u0644\u0643\u0623\u0633. \u0635\u0648\u062a \u0648\u0627\u062d\u062f \u0644\u0643\u0644 \u062c\u0647\u0627\u0632.",
    voteTotalVotes: "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0623\u0635\u0648\u0627\u062a",
    voteYouVoted: "\u0635\u0648\u062a\u062a!",
    voteByVotes: "\u062d\u0633\u0628 \u0627\u0644\u0623\u0635\u0648\u0627\u062a",
    voteAZ: "\u0623 \u2013 \u064a",
    voteLeading: "\u0645\u062a\u0642\u062f\u0645",
    voteCountedMsg: "\u062a\u0645 \u062a\u0633\u062c\u064a\u0644 \u0635\u0648\u062a\u0643!",
    voteTapHint: "\u0627\u0636\u063a\u0637 \u0639\u0644\u0649 \u0641\u0631\u064a\u0642 \u0644\u0644\u062a\u0635\u0648\u064a\u062a \u2014 \u0635\u0648\u062a \u0648\u0627\u062d\u062f \u0644\u0643\u0644 \u062c\u0647\u0627\u0632",
    voteAlreadyVoted: "\u0644\u0642\u062f \u0635\u0648\u062a\u062a \u0645\u0633\u0628\u0642\u0627\u064b!",
    voteErrorMsg: "\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u062a\u0635\u0648\u064a\u062a",
    voteRetryHint: "\u064a\u0631\u062c\u0649 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0635\u0641\u062d\u0629 \u0648\u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u062c\u062f\u062f\u0627\u064b.",
    voteNotConfigured: "\u0646\u0638\u0627\u0645 \u0627\u0644\u062a\u0635\u0648\u064a\u062a \u063a\u064a\u0631 \u0645\u0647\u064a\u0623.",
    voteTeamsRealtime: "\u0641\u0631\u064a\u0642 \u2022 \u062a\u062d\u062f\u064a\u062b\u0627\u062a \u0645\u0628\u0627\u0634\u0631\u0629",
    voteGroupLabel: "\u0645\u062c\u0645\u0648\u0639\u0629",
  },
} as const;

type T = typeof translations[Lang];

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: T;
  isRtl: boolean;
}

const LangContext = createContext<LangContextValue>({
  lang: "ar",
  setLang: () => {},
  t: translations.ar as T,
  isRtl: true,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const stored = (typeof localStorage !== "undefined" ? localStorage.getItem("kp_lang") : null) as Lang | null;
  const [lang, setLangState] = useState<Lang>(stored ?? "ar");

  const setLang = (l: Lang) => {
    localStorage.setItem("kp_lang", l);
    setLangState(l);
  };

  const isRtl = lang === "ar";

  useEffect(() => {
    document.documentElement.dir  = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang, isRtl]);

  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang], isRtl }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
