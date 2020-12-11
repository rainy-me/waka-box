import dotenv from "dotenv";
dotenv.config();
// @ts-ignore
import { WakaTimeClient, RANGE } from "wakatime-client";
import Octokit from "@octokit/rest";
import Response from "./fixture.json";
type R = typeof Response;

const {
  DRY,
  GIST_ID: gist_id,
  GH_TOKEN: github_token,
  WAKATIME_API_KEY: wakatime_api_key
} = process.env;

const __DRY__ = !!DRY;

async function main() {
  const wakatime = new WakaTimeClient(wakatime_api_key);

  const { data }: R = await wakatime.getMyStats({
    range: RANGE.LAST_7_DAYS
  });
  const lines = [];
  lines.push(
    [
      "Total".padEnd(11),
      data.human_readable_total_including_other_language
    ].join(" ")
  );

  data.languages.slice(0, 5).forEach(({ name, percent, text: time }) => {
    lines.push(
      [
        name.padEnd(11),
        time.padEnd(14),
        generateBarChart(percent, 18),
        String(percent.toFixed(1)).padStart(5) + "%"
      ].join(" ")
    );
  });

  if (lines.length == 0) return;

  const octokit = new Octokit({ auth: `token ${github_token}` });

  let gist: Octokit.Response<Octokit.GistsGetResponse> | null;
  try {
    gist = await octokit.gists.get({ gist_id });
  } catch (error) {
    console.error(`Unable to get gist\n${error}`);
  }

  try {
    // Get original filename to update that same file
    const filename = Object.keys(gist.data.files)[0];
    if (__DRY__) {
      console.log(lines.join("\n"));
      return;
    }
    await octokit.gists.update({
      gist_id,
      files: {
        [filename]: {
          filename: `development breakdown last week`,
          content: lines.join("\n")
        }
      }
    });
  } catch (error) {
    console.error(`Unable to update gist\n${error}`);
  }
}

function generateBarChart(percent: number, size: number) {
  const syms = "░▏▎▍▌▋▊▉█";
  const frac = Math.floor((size * 8 * percent) / 100);
  const barsFull = Math.floor(frac / 8);

  if (barsFull >= size) {
    return syms.substring(8, 9).repeat(size);
  }
  const semi = frac % 8;

  return [syms.substring(8, 9).repeat(barsFull), syms.substring(semi, semi + 1)]
    .join("")
    .padEnd(size, syms.substring(0, 1));
}

main();
