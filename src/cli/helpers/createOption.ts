import { Argument, Option } from "commander";
import type { CommandOption } from "../types.js";

export const createOption = (option: CommandOption) => {
  const { choices, shortName, name, description, required, paramName } = option;
  const optionValueString = required ? `<${name}>` : `[${name}]`;

  return new Option(
    `${shortName ? `-${shortName}, ` : ""}--${
      paramName ?? name
    } ${optionValueString}`,
    choices?.length
      ? `${description} (choices: ${choices.join(", ")})`
      : description
  ).default(option.defaultValue);
};

export const createArgument = (argument: CommandOption) => {
  const {
    name,
    description,
    required,
    paramName,
    shortName,
    choices,
    defaultValue,
  } = argument;
  const argumentValueString = required ? `<${name}>` : `[${name}]`;

  const args = new Argument(
    `${shortName ? `-${shortName}, ` : ""}${
      paramName ?? name
    } ${argumentValueString}`,
    description
  );

  if (defaultValue) {
    args.defaultValue(defaultValue);
  }

  if (choices?.length) {
    args.choices(choices);
  }

  return args;
};
