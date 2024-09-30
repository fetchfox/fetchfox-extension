import { useStorage } from "@plasmohq/storage/hook";

export function useGlobalError() {
  const [globalError] = useStorage("globalError");
  return globalError;
}
