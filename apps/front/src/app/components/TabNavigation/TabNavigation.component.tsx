import { TabNav } from "@radix-ui/themes";
import type { FC } from "react";
import { useLocation } from "react-router";

export const TabNavigation: FC<{
	links: Record<string, string>;
	activeLink?: string;
	onLinkClick: (link: string) => void;
}> = ({ links, activeLink, onLinkClick }) => {
	// const location = useLocation();
	return (
		<TabNav.Root
			size="2"
			style={{
				flex: "0 0 auto",
			}}
		>
			{Object.entries(links).map(([link, label]) => (
				<TabNav.Link
					key={link}
					href={link}
					onClick={(event) => {
						event.preventDefault();
						onLinkClick(link);
					}}
					active={activeLink === link}
				>
					{label}
				</TabNav.Link>
			))}
		</TabNav.Root>
	);
};
