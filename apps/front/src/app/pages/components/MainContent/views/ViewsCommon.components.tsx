import { Flex } from "@radix-ui/themes";
import styled from "styled-components";

export const ViewContainer = styled.div`
    overflow-y: auto;
	background-color: var(--gray-a3);
    flex: 1 0 90%;
    max-height: 100%;
    min-height: 0;
`;
export const ViewInnerContainer = styled(Flex)`
    max-height: 100%;
    min-height: 0;
    width: 100%;
`;
