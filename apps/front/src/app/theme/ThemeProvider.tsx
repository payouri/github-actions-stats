import { Theme } from "@radix-ui/themes";
import type { FC, PropsWithChildren } from "react";

export const RadixThemeProvider: FC<
	PropsWithChildren<Record<string, unknown>>
> = ({ children }) => <Theme>{children}</Theme>;
