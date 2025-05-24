// Step 1: Define a utility type to extract method names from the original object type
type MethodNames<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? K : never;
}[keyof T];

// Step 2: Define the final type that merges the original object type with the method overrides
export type OverrideMethods<
  T,
  U extends { [Methods in MethodNames<T>]?: (...args: any[]) => any }
> = {
  [K in keyof T]: K extends keyof U
    ? U[K] extends undefined | never
      ? T[K]
      : U[K]
    : T[K];
};
