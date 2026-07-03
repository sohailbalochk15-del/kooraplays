import { useEffect } from "react";

export function useDocumentTitle(title: string, description?: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    let descTag: HTMLMetaElement | null = null;
    let prevDescription: string | null = null;
    if (description) {
      descTag = document.querySelector('meta[name="description"]');
      if (descTag) {
        prevDescription = descTag.getAttribute("content");
        descTag.setAttribute("content", description);
      }
    }

    return () => {
      document.title = prevTitle;
      if (descTag && prevDescription !== null) {
        descTag.setAttribute("content", prevDescription);
      }
    };
  }, [title, description]);
}
