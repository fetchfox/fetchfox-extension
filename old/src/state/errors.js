import { useLocal } from "./storage";

export function useGlobalError() {
  const [globalError] = useLocal("globalError");
  return globalError;
}
