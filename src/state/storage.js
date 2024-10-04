import { useStorage } from "@plasmohq/storage/hook";
import { Storage } from "@plasmohq/storage";
// import { storage } from "../../../lib/extension";

export const storage = new Storage({ area: 'local' });

export const useLocal = (key, initial) => {
  return useStorage({ key, instance: storage }, initial);
}
