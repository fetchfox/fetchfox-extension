import { nextId } from "../../old/src/lib/store"

export default async function handler(_, res) {
  res.send(await nextId())
}
