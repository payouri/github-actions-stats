import type { upsertWorkflowProcedureInputSchema } from "@github-actions-stats/workflow-client/src/procedures/workflow.procedures";
import type { StoredWorkflowWithKey } from "@github-actions-stats/workflow-entity";
import { PlusIcon } from "@radix-ui/react-icons";
import { Button, Dialog, Flex, RadioCards } from "@radix-ui/themes";
import { type FC, useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import type { z } from "zod";
import { CreateWorkflowForm } from "./components/CreateWorkflowForm.component";
import { WorkflowSidebarItem } from "./components/WorkflowSidebarItem.component";
import { queryClientUtils, trpcReactClient } from "../../hooks/useRequest";

const SHOW_MODAL_QUERY_PARAM = "show-create-workflow-modal";

export type WorkflowSidebarProps = {
	workflows: StoredWorkflowWithKey[];
	gridArea?: string;
	selectedWorkflow: string | undefined;
	onNewWorkflowAdded:
		| ((workflowData: StoredWorkflowWithKey) => void)
		| undefined;
	onWorkflowSelected: ((workflowKey: string) => void) | undefined;
};

export const WorkflowSidebar: FC<WorkflowSidebarProps> = ({
	workflows,
	onNewWorkflowAdded,
	onWorkflowSelected,
	selectedWorkflow,
	gridArea = "sidebar",
}) => {
	const { search } = useLocation();
	const navigate = useNavigate();
	const isCreatingWorkflow = queryClientUtils.upsertWorkflow.isMutating();

	const onNewWorkflowClick = useCallback(() => {
		if (search.includes(`${SHOW_MODAL_QUERY_PARAM}=true`)) {
			return;
		}
		const newSearch = new URLSearchParams(search);
		newSearch.set(SHOW_MODAL_QUERY_PARAM, "true");
		navigate({ search: newSearch.toString() }, { replace: true });
	}, [search, navigate]);
	const onDialogClose = useCallback(() => {
		const newSearch = new URLSearchParams(search);
		newSearch.delete(SHOW_MODAL_QUERY_PARAM);
		navigate({ search: newSearch.toString() }, { replace: true });
	}, [search, navigate]);
	async function onCreateWorkflow(
		params: z.infer<typeof upsertWorkflowProcedureInputSchema>,
	) {
		if (!onNewWorkflowAdded) {
			throw new Error("onNewWorkflowAdded is not defined");
		}

		const response = await trpcReactClient.upsertWorkflow.mutate(params);
		if (response.hasFailed) {
			return {
				status: "failed",
				message: response.message,
			} as const;
		}

		onNewWorkflowAdded(response.data);
		onDialogClose();
		console.log(
			queryClientUtils.getWorkflows.getData({
				count: 10,
				start: 0,
			}),
		);

		return {
			status: "success",
		} as const;
	}

	return (
		<Flex
			style={{
				boxShadow: "var(--shadow-1)",
				gridArea,
			}}
			p="0"
			gap="0"
			direction="column"
		>
			<Button
				variant="solid"
				size="3"
				radius="none"
				disabled={typeof onNewWorkflowAdded !== "function"}
				onClick={onNewWorkflowClick}
			>
				<Flex align="center" justify="between" width="100%">
					Add Workflow
					<PlusIcon />
				</Flex>
			</Button>
			<RadioCards.Root
				variant="surface"
				defaultValue={undefined}
				value={selectedWorkflow}
				size="2"
				gap="0"
				onValueChange={onWorkflowSelected}
			>
				{workflows.map((workflow) => (
					<WorkflowSidebarItem
						{...workflow}
						workflowKey={workflow.key}
						key={workflow.key}
					/>
				))}
			</RadioCards.Root>

			<Dialog.Root
				open={search.includes(`${SHOW_MODAL_QUERY_PARAM}=true`)}
				onOpenChange={onDialogClose}
			>
				<Dialog.Content>
					<Dialog.Title>Create a new workflow</Dialog.Title>
					<Dialog.Description size="2" mb="3">
						Create a new workflow to track your GitHub Actions runs.
					</Dialog.Description>
					<CreateWorkflowForm
						onCreateWorkflow={onCreateWorkflow}
						isCreatingWorkflow={isCreatingWorkflow > 0}
					/>
				</Dialog.Content>
			</Dialog.Root>
		</Flex>
	);
};
