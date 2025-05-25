import type { StoredWorkflowWithKey } from "@github-actions-stats/workflow-entity";
import { PlusIcon } from "@radix-ui/react-icons";
import { Button, Flex, RadioCards } from "@radix-ui/themes";
import type { FC } from "react";
import { WorkflowSidebarItem } from "./components/WorkflowSidebarItem.component";

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
		</Flex>
	);
};
