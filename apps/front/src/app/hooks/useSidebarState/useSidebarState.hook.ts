import { useReducer } from "react";
import { queryClientUtils } from "../useRequest";

type SidebarState = {
	selectedWorkflow: string | undefined;
};

type SidebarAction = [
	| {
			type: "selectWorkflow";
			payload: string;
	  }
	| {
			type: "deselectWorkflow";
	  },
];

const useSidebarStateReducer = () => {
	return useReducer<SidebarState, SidebarAction>(
		(state, action) => {
			switch (action.type) {
				case "selectWorkflow":
					return {
						...state,
						selectedWorkflow: action.payload,
					};
				case "deselectWorkflow":
					return {
						...state,
						selectedWorkflow: undefined,
					};
			}
		},
		{
			selectedWorkflow: undefined,
		},
	);
};

export function useSidebarState() {
	const [state, dispatch] = useSidebarStateReducer();

	return {
		...state,
		setSelectedWorkflow: (workflowName: string) => {
			dispatch({
				type: "selectWorkflow",
				payload: workflowName,
			});
		},
		deselectWorkflow: () => {
			dispatch({
				type: "deselectWorkflow",
			});
		},
	};
}
