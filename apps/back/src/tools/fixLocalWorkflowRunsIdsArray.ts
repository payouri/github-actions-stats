import { readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { AnyZodObject, z } from "zod";
import {
	generateWorkflowKey,
	generateWorkflowRunKey,
} from "../helpers/generateWorkflowKey.js";
import {
	workflowRunsStorage,
	workflowStorage,
} from "../cli/entities/RetrievedWorkflowData/storage.js";
import { isExistingPath } from "../helpers/isExistingPath.js";
import toolLogger from "./logger.js";

function tryParseJSON<Schema extends AnyZodObject>(
	schema: Schema,
	json: string,
): ReturnType<Schema["safeParse"]> | null {
	try {
		return schema.safeParse(JSON.parse(json)) as ReturnType<
			Schema["safeParse"]
		>;
	} catch (error) {
		return null;
	}
}

async function updateWorkflowFile(
	workflowFilePath: string,
	originalData: z.infer<typeof workflowStorage.schema>,
	update: Partial<z.infer<typeof workflowStorage.schema>>,
) {
	const updatedData = {
		...originalData,
		...update,
	};
	const updatedDataString = JSON.stringify(updatedData, null, 0);
	await writeFile(workflowFilePath, updatedDataString, "utf-8");
}

async function main(params: {
	workflowName: string;
	workflowOwner: string;
	workflowRepository: string;
	dryRun?: boolean;
}) {
	const {
		workflowName,
		workflowOwner,
		workflowRepository,
		dryRun = true,
	} = params;
	toolLogger.info(`Fixing workflow runs ids for workflow ${workflowName}`);
	const workflowKey = generateWorkflowKey({
		workflowName,
		workflowParams: {
			owner: workflowOwner,
			repo: workflowRepository,
		},
	});

	const workflowFilePath = workflowStorage.getFilePath(workflowKey);
	const runsDirectoryPath = workflowRunsStorage
		.getFilePath(
			generateWorkflowRunKey({
				repositoryName: workflowRepository,
				repositoryOwner: workflowOwner,
				runId: 0,
				workflowName,
			}),
		)
		.replace("0.json", "");

	const [isWorkflowFileExists, isRunsDirectoryExists] = await Promise.all([
		isExistingPath(workflowFilePath),
		isExistingPath(runsDirectoryPath),
	]);

	if (!isWorkflowFileExists) {
		toolLogger.error(`Workflow file not found: ${workflowFilePath}`);
		return;
	}
	const workflowDataParseResult = tryParseJSON(
		workflowStorage.schema,
		await readFile(workflowFilePath, "utf-8"),
	);
	if (!workflowDataParseResult?.success) {
		toolLogger.error(
			`Failed to parse workflow data: ${workflowFilePath}`,
			workflowDataParseResult?.error || "Failed to JSON.parse",
		);
		return;
	}
	if (!isRunsDirectoryExists) {
		toolLogger.warn(`Workflow runs directory not found: ${runsDirectoryPath}`);
		if (dryRun) {
			toolLogger.warn("Would have workflow runs with empty runs array");
			return;
		}
		await updateWorkflowFile(workflowFilePath, workflowDataParseResult.data, {
			workflowsList: [],
			totalWorkflowRuns: 0,
		});
		toolLogger.info(`Workflow file updated: ${workflowFilePath}`);
		return;
	}
	const workflowRunsIdsSet = new Set<number>();
	for (const children of await readdir(runsDirectoryPath, {
		withFileTypes: true,
	})) {
		if (children.isDirectory()) {
			continue;
		}
		const fileName = basename(children.name);
		const [_, fileExtension] = fileName.split(".");
		if (fileExtension !== "json") {
			continue;
		}

		const filePath = join(runsDirectoryPath, fileName);
		const result = tryParseJSON(
			workflowRunsStorage.schema,
			await readFile(filePath, "utf-8"),
		);
		if (!result?.success) {
			toolLogger.error(
				`Failed to parse workflow run data: ${filePath}`,
				result?.error || "Failed to JSON.parse",
			);
			if (dryRun) {
				toolLogger.warn(
					`Would have deleted invalid workflow run file: ${filePath}`,
				);
				continue;
			}
			await unlink(filePath);
			toolLogger.info(`Deleted invalid workflow run file: ${filePath}`);
			continue;
		}
		workflowRunsIdsSet.add(result.data.runId);
	}

	const workflowRunsIdsArray = Array.from(workflowRunsIdsSet).sort(
		(a, b) => a - b,
	);

	if (dryRun) {
		toolLogger.warn(
			"Would have workflow runs with updated runs array and total runs count",
		);
		return;
	}

	await updateWorkflowFile(workflowFilePath, workflowDataParseResult.data, {
		workflowsList: workflowRunsIdsArray,
		totalWorkflowRuns: workflowRunsIdsArray.length,
	});
	toolLogger.info(`Workflow file updated: ${workflowFilePath}`);

	process.exit(0);
}

function parseArgs() {
	const args = process.argv.slice(2);
	const workflowName = args[0];
	const workflowOwner = args[1];
	const workflowRepository = args[2];
	const dryRun = args[3] !== "--disable-dry-run";
	if (!workflowName || !workflowOwner || !workflowRepository) {
		throw new Error(
			"Command signature is wrong, e.g. tsx tools/fixLocalWorkflowRunsIdsArray.ts workflowName workflowOwner workflowRepository [--disable-dry-run]",
		);
	}

	return {
		workflowName,
		workflowOwner,
		workflowRepository,
		dryRun,
	};
}

await main(parseArgs());
