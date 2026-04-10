import { useEffect, useState } from "react";

export function useHashRoute(validRoutes, defaultRoute = "dashboard") {
  const readRoute = () => {
    const nextRoute = window.location.hash.replace("#/", "") || defaultRoute;
    return validRoutes.includes(nextRoute) ? nextRoute : defaultRoute;
  };

  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const handleChange = () => setRoute(readRoute());
    window.addEventListener("hashchange", handleChange);

    if (!window.location.hash) {
      window.location.hash = `#/${defaultRoute}`;
    } else {
      handleChange();
    }

    return () => window.removeEventListener("hashchange", handleChange);
  }, [defaultRoute]);

  const navigate = (nextRoute) => {
    window.location.hash = `#/${nextRoute}`;
  };

  return { route, navigate };
}
