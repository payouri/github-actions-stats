import type { FC } from "react";
import { ViewContainer, ViewInnerContainer } from "./ViewsCommon.components";

export const DEFAULT_RUNS_PER_PAGE = 10;
export const RUNS_PER_PAGE_OPTIONS = [DEFAULT_RUNS_PER_PAGE, 20, 50, 100];

export const RunsView: FC = () => {
	return (
		<ViewContainer>
			<ViewInnerContainer>Runs</ViewInnerContainer>
		</ViewContainer>
	);
};
