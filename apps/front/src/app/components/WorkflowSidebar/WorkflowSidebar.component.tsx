import type { StoredWorkflowWithKey } from "@github-actions-stats/workflow-entity";
import { PlusIcon } from "@radix-ui/react-icons";
import { Button, Flex, RadioCards, Text, TextField } from "@radix-ui/themes";
import { useCallback, type FC } from "react";
import { useForm } from "react-hook-form";
import { WorkflowSidebarItem } from "./components/WorkflowSidebarItem.component";
import { Form, useLocation, useNavigate } from "react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@radix-ui/themes";
import { Label } from "radix-ui";
import { upsertWorkflowProcedureInputSchema } from "@github-actions-stats/workflow-client/src/procedures/workflow.procedures";

const SHOW_MODAL_QUERY_PARAM = "show-create-workflow-modal";

export type WorkflowSidebarProps = {
	workflows: StoredWorkflowWithKey[];
	gridArea?: string;
	selectedWorkflow: string | undefined;
	onNewWorkflowAdded: ((workflowKey: string) => void) | undefined;
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
	const { register, handleSubmit, formState } = useForm({
		resolver: zodResolver(upsertWorkflowProcedureInputSchema),
	});
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
	function onSubmit(...args) {
		console.log("onSubmit", args);
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
				// disabled={typeof onNewWorkflowAdded !== "function"}
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
					<form onSubmit={handleSubmit(onSubmit)}>
						<Flex direction="column" gap="3">
							<Label.Root>
								<Text as="div" size="2" mb="1" weight="bold">
									Organization
								</Text>
								<TextField.Root
									{...register("githubOwner")}
									placeholder="e.g. org-name"
								/>
							</Label.Root>
							<Label.Root>
								<Text as="div" size="2" mb="1" weight="bold">
									Repository
								</Text>
								<TextField.Root
									{...register("githubRepository")}
									placeholder="e.g. my-repo"
								/>
							</Label.Root>
							<Label.Root>
								<Text as="div" size="2" mb="1" weight="bold">
									Workflow Id
								</Text>
								<TextField.Root
									{...register("workflowId")}
									type="number"
									placeholder="e.g. 213131313"
								/>
							</Label.Root>
							<Button type="submit" variant="solid" size="2">
								Create Workflow
							</Button>
						</Flex>
					</form>
				</Dialog.Content>
			</Dialog.Root>
		</Flex>
	);
};
