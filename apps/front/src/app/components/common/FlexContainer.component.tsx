import type { CSSProperties, FC, PropsWithChildren } from "react";
import styled from "styled-components";

export type FlexContainerProps = PropsWithChildren<
	Pick<CSSProperties, "flex" | "flexDirection" | "gap">
>;

const FlexElement = styled.div<FlexContainerProps>`
	display: flex;
	flex-direction: ${({ flexDirection }) => flexDirection};
	gap: ${({ gap }) => gap};
`;
export const FlexContainer: FC<FlexContainerProps> = ({
	flex,
	flexDirection,
	gap,
	children,
}) => {
	return (
		<FlexElement flex={flex} flexDirection={flexDirection} gap={gap}>
			{children}
		</FlexElement>
	);
};
