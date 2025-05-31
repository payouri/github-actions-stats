import type { FC } from "react";
import { ViewContainer, ViewInnerContainer } from "./ViewsCommon.components";
import {
	useMainContentDataLoader,
	useRouteMainContentDataLoader,
	useStatsDataLoader,
} from "../MainContent.loader";
import { NumberBox } from "../../../../components/NumberBox/NumberBox.component";

const StatsBoxes: FC<{
	loading: boolean;
	boxes: {
		label: string;
		value: number;
	}[];
}> = ({ loading, boxes }) => {
	if (loading) {
		return <div>Loading...</div>;
	}

	return (
		<div>
			{boxes.map(({ label, value }) => (
				<NumberBox key={label} label={label} value={value} />
			))}
		</div>
	);
};

export const OverviewView: FC = () => {
	const { workflowRuns } = useMainContentDataLoader();
	console.log("🚀 ~ useStatsDataLoader:", useStatsDataLoader());
	return (
		<ViewContainer>
			<ViewInnerContainer>
				<StatsBoxes boxes={[]} loading={true} />
			</ViewInnerContainer>
		</ViewContainer>
	);
};
