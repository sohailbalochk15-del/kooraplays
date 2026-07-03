import { useEffect, useState } from "react";
import { isPast, parseISO } from "date-fns";
import { translations, type Lang } from "@/lib/i18n";

interface Props {
  targetDate: string;
  lang: Lang;
}

export function CountdownTimer({ targetDate, lang }: Props) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isUrgent, setIsUrgent] = useState(false);

  const u = translations[lang];

  useEffect(() => {
    const updateTimer = () => {
      try {
        const date = parseISO(targetDate);
        if (isPast(date)) {
          setTimeLeft(u.started);
          setIsUrgent(true);
          return;
        }

        const msDiff = date.getTime() - Date.now();
        setIsUrgent(msDiff < 60 * 60 * 1000);

        const days    = Math.floor(msDiff / (1000 * 60 * 60 * 24));
        const hours   = Math.floor((msDiff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((msDiff / 1000 / 60) % 60);
        const seconds = Math.floor((msDiff / 1000) % 60);

        const parts: string[] = [];
        if (days > 0)                             parts.push(`${days}${u.days}`);
        if (hours > 0 || days > 0)                parts.push(`${hours}${u.hours}`);
        if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}${u.minutes}`);
        parts.push(`${seconds}${u.seconds}`);

        setTimeLeft(parts.join(" "));
      } catch {
        setTimeLeft("");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetDate, lang, u]);

  return (
    <span
      dir="ltr"
      className={`font-mono text-sm font-medium ${isUrgent ? "text-destructive" : "text-muted-foreground"}`}
    >
      {timeLeft}
    </span>
  );
}
