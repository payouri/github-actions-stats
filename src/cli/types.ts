import { ZodSchema } from "zod";

export type CommandOption = Readonly<{
  name: string;
  paramName?: string;
  shortName?: string;
  description: string;
  required?: boolean;
  validator?: ZodSchema;
  choices?: string[];
  defaultValue?: string | boolean | string[];
}>;
