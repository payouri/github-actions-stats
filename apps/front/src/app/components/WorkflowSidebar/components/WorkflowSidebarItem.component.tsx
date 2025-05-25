import type { StoredWorkflowWithKey } from "@github-actions-stats/workflow-entity";
import { Flex, Heading, RadioCards, Text } from "@radix-ui/themes";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import type { FC } from "react";
import styled from "styled-components";

const StyledRadioCardsItem = styled(RadioCards.Item)`
	border: none;
	border-width: 0;
	box-shadow: unset;
	outline: none;
	border-radius: 0;
	padding: var(--space-2) var(--space-4);
	&:before, &:after {
		content: unset;
	}
	&:not([disabled]):not([data-disabled]):not(:active):not([data-state="checked"]):hover {
		background-color: var(--focus-5)
	}
	&[data-state="checked"] {
		background-color: var(--focus-7);
	}
`;
export const WorkflowSidebarItem: FC<
	StoredWorkflowWithKey & {
		workflowKey: string;
	}
> = ({ workflowName, totalWorkflowRuns, workflowParams, workflowKey }) => {
	return (
		<StyledRadioCardsItem value={workflowKey}>
			<Flex
				gap="1"
				align="baseline"
				width="100%"
				direction="row"
				justify="center"
			>
				<Flex direction="column" flexShrink="1" flexGrow="0" flexBasis="100%">
					<Heading
						size="3"
						style={{
							textTransform: "capitalize",
						}}
					>
						{workflowName}
					</Heading>
					<Text size="2">{totalWorkflowRuns} runs recorded</Text>
					<Text size="2">
						{workflowParams.owner}/{workflowParams.repo}
					</Text>
				</Flex>
				<GitHubLogoIcon style={{ flex: "0 0 auto" }} />
			</Flex>
		</StyledRadioCardsItem>
	);
};
