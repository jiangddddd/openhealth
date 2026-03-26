import { useEffect, useState } from "react";

export function useHashRoute(validRoutes, defaultRoute = "home") {
  const readRoute = () => {
    const route = window.location.hash.replace("#/", "") || defaultRoute;
    return validRoutes.includes(route) ? route : defaultRoute;
  };

  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const handler = () => setRoute(readRoute());
    window.addEventListener("hashchange", handler);
    if (!window.location.hash) {
      window.location.hash = `#/${defaultRoute}`;
    } else {
      handler();
    }

    return () => window.removeEventListener("hashchange", handler);
  }, [defaultRoute]);

  const navigate = (nextRoute) => {
    window.location.hash = `#/${nextRoute}`;
  };

  return { route, navigate };
}
