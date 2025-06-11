import {
	Text,
	Heading,
	Flex,
	type TextProps,
	type HeadingProps,
} from "@radix-ui/themes";
import type { FC } from "react";

export const NumberBox: FC<{
	value: number;
	label: string;
	bgColor?: string;
	numberColor?: HeadingProps["color"];
	labelColor?: TextProps["color"];
}> = ({
	value,
	label,
	bgColor = "var(--gray-a5)",
	numberColor,
	labelColor,
}) => {
	return (
		<Flex
			align="center"
			justify="center"
			direction="column"
			maxWidth="100%"
			p="5"
			flexShrink="0"
			flexGrow="1"
			flexBasis="auto"
			style={{
				aspectRatio: "1",
				border: "1px solid var(--gray-10)",
				backgroundColor: bgColor,
			}}
		>
			<Heading size="7" color={numberColor}>
				{Math.round(value)}
			</Heading>
			<Text
				color={labelColor}
				style={{
					textOverflow: "ellipsis",
					maxWidth: "100%",
					overflow: "hidden",
					whiteSpace: "nowrap",
				}}
			>
				{label}
			</Text>
		</Flex>
	);
};
