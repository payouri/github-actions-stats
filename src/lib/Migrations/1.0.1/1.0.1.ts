namespace Migration {
  export type MigrationType = "auto" | "manual";
}

interface Migration {
  type: Migration.MigrationType;
}
