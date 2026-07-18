import { useMatches } from "react-router-dom";
import { useEffect } from "react";

interface RouteHandle {
  title?: string;
}

export function usePageTitle() {
  const matches = useMatches();

  useEffect(() => {
    // Find the deepest match with a handle containing a title
    const match = [...matches].reverse().find((m) => {
      const handle = m.handle as RouteHandle | undefined;
      return handle && typeof handle.title === "string";
    });

    if (match) {
      const handle = match.handle as RouteHandle;
      if (handle.title) {
        document.title = handle.title;
      }
    }
  }, [matches]);
}
