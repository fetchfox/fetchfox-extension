import { useStorage } from "@plasmohq/storage/hook";
import { storage } from "../../../lib/extension";

export const useLocal = (key) => {
  return useStorage({ key, instance: storage });
}
