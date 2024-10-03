import { useStorage } from "@plasmohq/storage/hook";
import { storage } from "../../../lib/extension";

export const useLocal = (key, initial) => {
  return useStorage({ key, instance: storage }, initial);
}
