import { useEffect } from "react";

export function useStructuredData(data: Record<string, unknown> | null, key: string) {
  useEffect(() => {
    if (!data) return undefined;

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-dynamic-jsonld", key);
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [data, key]);
}
