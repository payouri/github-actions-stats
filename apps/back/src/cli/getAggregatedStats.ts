// import { Command } from "commander";
// import { isAbsolute } from "path";
// import { z } from "zod";
// import { GITHUB_TOKEN_OPTION } from "./constants.js";
// import { createOption } from "./helpers/createOption.js";
// import { CommandOption } from "./types.js";
// import { buildGithubStatsModule } from "../cli.js";
// import { retrievedWorkflowService } from "../entities/index.js";

// const PERIOD_CHOICES = ["day", "week", "month", "year"] as const;

// const getAggregatedStatsCommandOptions: CommandOption[] = [
//   {
//     name: "period",
//     description: "Period",
//     required: true,
//     choices: Array.from(PERIOD_CHOICES),
//     validator: z.string().refine((v) => PERIOD_CHOICES.includes(v as any), {
//       message: `Period must be one of ${PERIOD_CHOICES.join(", ")}`,
//     }),
//   },
//   {
//     name: "workflowDataFile",
//     description: "File path to compute stats from",
//     required: true,
//     validator: z
//       .string()
//       .refine(
//         (v) => {
//           return v.endsWith(".json");
//         },
//         {
//           message: "File path must end with .json",
//         }
//       )
//       .refine(
//         (v) => {
//           return isAbsolute(v);
//         },
//         {
//           message: "File path must be absolute",
//         }
//       ),
//   },
//   {
//     name: "outputFile",
//     description: "File path to save data",
//     required: true,
//     validator: z
//       .string()
//       .refine(
//         (v) => {
//           return v.endsWith(".json");
//         },
//         {
//           message: "File path must end with .json",
//         }
//       )
//       .refine(
//         (v) => {
//           return isAbsolute(v);
//         },
//         {
//           message: "File path must be absolute",
//         }
//       ),
//   },
// ];

// export const buildGetAggregatedStatsCommand = (program: Command) => {
//   const getAggregatedStats = new Command("get-aggregated-stats")
//     .description("Get aggregated stats")
//     .action(async (parsedOptions) => {
//       const globalOptions = program.opts();
//       const githubToken = globalOptions[GITHUB_TOKEN_OPTION.name];

//       for (const option of getAggregatedStatsCommandOptions) {
//         if (
//           option.required &&
//           !option.defaultValue &&
//           !parsedOptions[option.name]
//         ) {
//           throw new Error(`Option ${option.name} is required`);
//         }
//         if (option.validator) {
//           const { name } = option;
//           const optionValue = parsedOptions[name];
//           option.validator.parse(optionValue);
//         }
//       }

//       const statsModule = buildGithubStatsModule({
//         githubToken,
//       });

//       const fileContent =
//         await retrievedWorkflowService.loadRetrievedWorkflowData(
//           parsedOptions.workflowDataFile
//         );

//       if (fileContent.hasFailed) {
//         throw new Error(`Failed to load workflow data`, {
//           cause: fileContent.error,
//         });
//       }

//       const result = retrievedWorkflowService.createWorkflowInstance(
//         fileContent.data
//       );

//       const res = await statsModule.getWorkflowStats(result, {
//         localOnly: true,
//       });
//       if (res.hasFailed) {
//         throw new Error(`Failed to compute stats`, {
//           cause: res.error,
//         });
//       }
//       const getAggregatedStatsResult = statsModule.getAggregatedStats(
//         res.data,
//         {
//           period: parsedOptions.period,
//           fromDate: parsedOptions.fromDate,
//           toDate: parsedOptions.toDate,
//         }
//       );
//       if (getAggregatedStatsResult.hasFailed) {
//         throw new Error(`Failed to compute stats`, {
//           cause: getAggregatedStatsResult.error,
//         });
//       }
//       const writeResult = await statsModule.saveWorkflowStats(
//         getAggregatedStatsResult.data,
//         {
//           filePath: parsedOptions.outputFile,
//         }
//       );

//       if (writeResult.hasFailed) {
//         throw new Error(`Failed to save stats`, {
//           cause: writeResult.error,
//         });
//       }
//     });

//   for (const option of getAggregatedStatsCommandOptions) {
//     if (option.required) {
//       const { choices, shortName, name, description, required, paramName } =
//         option;
//       const optionValueString = required ? `<${name}>` : `[${name}]`;

//       getAggregatedStats.requiredOption(
//         `${shortName ? `-${shortName}, ` : ""}--${
//           paramName ?? name
//         } ${optionValueString}`,
//         choices?.length
//           ? `${description} (choices: ${choices.join(", ")})`
//           : description,
//         option.defaultValue
//       );
//     } else {
//       getAggregatedStats.addOption(createOption(option));
//     }
//   }

//   return getAggregatedStats;
// };
