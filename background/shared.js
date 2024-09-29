const runGetName = async (job) => {
  const slim = {}
  slim.scrape = job.scrape
  slim.urls = job.urls
  return exec("name", { job: JSON.stringify(slim, null, 2) }).then(
    (x) => x.name
  )
}

export const maybeNameJob = async (job) => {
  if (
    job.name.indexOf("Untitled") != -1 ||
    job.name.indexOf("undefined") != -1
  ) {
    const name = "" + (await runGetName(job))

    console.log("maybeNameJob got name:", name)

    job.name = name
    await saveJob(job)
  }
  return job
}
