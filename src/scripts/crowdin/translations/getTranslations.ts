import fs from "fs"

import { checkMarkdown } from "../../markdownChecker"
import crowdin from "../api-client/crowdinClient"
import crowdinImport from "../import/main"

import { DOT_CROWDIN, FILE_PATH, SUMMARY_PATH } from "./constants"
import getApprovedBuckets from "./getApprovedBuckets"
import type { BucketsList } from "./types"
import { decompressFile, downloadFile } from "./utils"

import "dotenv/config"

async function main() {
  const projectId = Number(process.env.CROWDIN_PROJECT_ID) || 363359

  try {
    const listProjectBuilds = await crowdin.translationsApi.listProjectBuilds(
      projectId
    )

    const latestId = listProjectBuilds.data
      .filter(({ data }) => data.status === "finished")
      .reverse()[0].data.id

    const downloadTranslations =
      await crowdin.translationsApi.downloadTranslations(projectId, latestId)
    const { url } = downloadTranslations.data

    // Download ZIP file
    await downloadFile(url, FILE_PATH)

    // Unzip file to .crowdin/
    await decompressFile(FILE_PATH, DOT_CROWDIN)

    // Delete .zip file once decompressed
    fs.rmSync(FILE_PATH)
    console.log("🗑️ Removed download from:", FILE_PATH)

    const buckets = (await getApprovedBuckets()) as BucketsList

    // Run Crowdin import script with buckets from Notion
    crowdinImport(buckets)

    // Check markdown
    checkMarkdown(SUMMARY_PATH)
  } catch (error: unknown) {
    console.error((error as Error).message)
  }
}

main()

export default main