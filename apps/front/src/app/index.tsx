import "@radix-ui/themes/styles.css";
import { StrictMode, Suspense, type FC } from "react";
import {
	Avatar,
	Flex,
	Heading,
	Text,
	Spinner,
	Container,
	Grid,
	Button,
	RadioCards,
} from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { RadixThemeProvider } from "./theme/ThemeProvider";
import styled from "styled-components";

const PageHeader: FC<{
	title?: string;
}> = ({ title }) => {
	return (
		<Container
			style={{
				boxShadow: "var(--shadow-1)",
				gridArea: "header",
			}}
			p={{ sm: "3", md: "3" }}
			px="3"
		>
			<Flex gap="1rem" align={{ xs: "center" }} justify={{ xs: "between" }}>
				{title && <Heading size="5">{title}</Heading>}
				<Avatar radius="full" fallback={<Spinner />} />
			</Flex>
		</Container>
	);
};

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
		background-color: red;
	}
`;
const WorkflowItem: FC<{
	name: string;
	runsCount: number;
}> = ({ name, runsCount }) => {
	return (
		<StyledRadioCardsItem value={name}>
			<Flex direction="column" width="100%">
				<Heading
					size="3"
					style={{
						textTransform: "capitalize",
					}}
				>
					{name}
				</Heading>
				<Text>{runsCount} runs recorded</Text>
			</Flex>
		</StyledRadioCardsItem>
	);
};
const Sidebar: FC<{
	workflows: string[];
}> = ({ workflows }) => {
	return (
		<Container
			style={{
				boxShadow: "var(--shadow-1)",
				gridArea: "sidebar",
			}}
			p="0"
		>
			<Flex
				gap="2"
				direction="column"
				// align={{ xs: "center" }}
				justify={{ xs: "between" }}
			>
				<Button variant="solid" size="3" radius="none">
					<Flex align="center" justify="between" width="100%">
						Add Workflow
						<PlusIcon />
					</Flex>
				</Button>
				<RadioCards.Root
					variant="surface"
					defaultValue={workflows[0]}
					size="2"
					gap="0"
				>
					{workflows.map((workflow) => (
						<WorkflowItem key={workflow} name={workflow} runsCount={10} />
					))}
				</RadioCards.Root>
			</Flex>
		</Container>
	);
};

const App = () => {
	return (
		<StrictMode>
			<Suspense fallback="loading">
				<RadixThemeProvider>
					<Grid
						columns={{ initial: "minmax(12rem, 0.25fr) 1fr 0.5fr" }}
						rows={{
							initial: "auto 1fr auto",
						}}
						areas={{
							initial:
								'"header header header" "sidebar content content"  "footer footer footer"',
						}}
						minHeight="100vh"
						maxHeight="100vh"
						width="100%"
					>
						<PageHeader title="Hello World" />
						<Sidebar workflows={["workflow1", "workflow2"]} />
						<div
							style={{
								gridArea: "content",
							}}
						>
							Hello World
						</div>
					</Grid>
				</RadixThemeProvider>
			</Suspense>
		</StrictMode>
	);
};

export default App;
