import type { StoredWorkflow } from "@github-actions-stats/workflow-entity";
import { PlusIcon } from "@radix-ui/react-icons";
import { Container, Flex, Button, RadioCards } from "@radix-ui/themes";
import type { FC } from "react";
import { WorkflowSidebarItem } from "./components/WorkflowSidebarItem.component";

export type WorkflowSidebarProps = {
	workflows: StoredWorkflow[];
	gridArea?: string;
	onNewWorkflowAdded: ((workflowName: string) => void) | undefined;
};

export const WorkflowSidebar: FC<WorkflowSidebarProps> = ({
	workflows,
	onNewWorkflowAdded,
	gridArea = "sidebar",
}) => {
	const defaultValue = workflows[0]?.workflowName;

	return (
		<Container
			style={{
				boxShadow: "var(--shadow-1)",
				gridArea,
			}}
			p="0"
		>
			<Flex gap="2" direction="column" justify={{ xs: "between" }}>
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
					defaultValue={defaultValue}
					size="2"
					gap="0"
				>
					{workflows.map((workflow) => (
						<WorkflowSidebarItem key={workflow.workflowName} {...workflow} />
					))}
				</RadioCards.Root>
			</Flex>
		</Container>
	);
};
