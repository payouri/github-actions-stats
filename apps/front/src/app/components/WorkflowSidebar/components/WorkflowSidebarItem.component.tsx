import type { StoredWorkflow } from "@github-actions-stats/workflow-entity";
import { Flex, Heading, RadioCards, Text } from "@radix-ui/themes";
import type { FC } from "react";
import styled from "styled-components";

const StyledRadioCardsItem = styled(RadioCards.Item)`
	border: none;
	border-width: 0;
	box-shadow: unset;
	outline: none;
	border-radius: 0;
	&:before, &:after {
		content: unset;
	}
	&:not([disabled]):not([data-disabled]):not(:active):hover {
		
	}
`;
export const WorkflowSidebarItem: FC<StoredWorkflow> = ({
	workflowName,
	totalWorkflowRuns,
}) => {
	return (
		<StyledRadioCardsItem value={workflowName}>
			<Flex direction="column" width="100%">
				<Heading
					size="3"
					style={{
						textTransform: "capitalize",
					}}
				>
					{workflowName}
				</Heading>
				<Text>{totalWorkflowRuns} runs recorded</Text>
			</Flex>
		</StyledRadioCardsItem>
	);
};
