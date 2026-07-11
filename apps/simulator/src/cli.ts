import { runGoldenScenario } from "./run-golden-scenario";

const result = runGoldenScenario();

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Loopin golden journey: ${result.summary.tripId}`);
  for (const step of result.steps) {
    console.log(`${step.at}  ${step.overallState.padEnd(9)}  ${step.components.map((members) => `[${members.join(", ")}]`).join(" ")}`);
  }
  console.log(`Regroup: ${result.selectedCandidateId ?? "no safe candidate"}`);
  console.log(`Final state: ${result.steps.at(-1)?.overallState ?? "unknown"}`);
  console.log(result.summary.narrative.text);
}
