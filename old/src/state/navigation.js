import { useEffect, useState } from "react";
import { getTabData } from "../lib/navigation";

export const useActivePage = () => {
  const [page, setPage] = useState();

  useEffect(() => {
    async function run() {
      console.log("use active page pre");

      // TODO: update on navigation
      const resp = await getTabData();

      console.log("use active page resp", resp);
      setPage(resp);
    }
    run();
  }, []);

  return page;
};
