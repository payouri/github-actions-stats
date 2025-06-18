import { ScrollArea, Select } from "@radix-ui/themes";
import { useLayoutEffect, useRef, type FC, type UIEventHandler } from "react";
import { trpcReact, trpcReactClient } from "../../hooks/useRequest";

const fetchThreshold = 100;

export const GithubRepositorySelect: FC = () => {
	const scrollRef = useRef<HTMLDivElement>(null);
	const query = trpcReact.listGithubRepositories.useInfiniteQuery(
		{
			count: 10,
		},
		{
			getNextPageParam(lastPage) {
				if (!lastPage.hasFailed) {
					return lastPage.data.nextCursor;
				}
				return null;
			},
		},
	);
	const data =
		query.data?.pages.flatMap((p) => {
			if (p.hasFailed) {
				throw new Error("Failed to load workflow runs");
			}
			return p.data.repositories;
		}) ?? [];

	useLayoutEffect(() => {
		if (!scrollRef.current) return;
		const { current: scrollElement } = scrollRef;

		const onScroll = (_: Event) => {
			const scrollTop = scrollElement.scrollTop;
			const scrollHeight = scrollElement.scrollHeight;
			const clientHeight = scrollElement.clientHeight;
			if (scrollTop + clientHeight >= scrollHeight - fetchThreshold) {
				query.fetchNextPage();
			}
		};
		scrollElement.addEventListener("scroll", onScroll);
		return () => {
			scrollElement.removeEventListener("scroll", onScroll);
		};
	}, [query.fetchNextPage]);

	return (
		<Select.Root defaultValue="apple">
			<Select.Trigger style={{ width: "100%" }} />
			<Select.Content style={{ width: "100%" }}>
				<ScrollArea
					ref={scrollRef}
					scrollbars="vertical"
					style={{
						maxHeight: "16rem",
					}}
				>
					{data?.map((repo) => {
						return (
							<Select.Item value={repo.name} key={repo.name}>
								{repo.name}
							</Select.Item>
						);
					})}
				</ScrollArea>
			</Select.Content>
		</Select.Root>
	);
};
