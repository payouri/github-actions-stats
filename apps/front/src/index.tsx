import { WORKFLOW_RUN_SCHEMA_VERSION } from "@github-actions-stats/workflow-entity";
import { createRoot } from "react-dom/client";
import App from "./app/index.js";

const root = createRoot(document.getElementById("root") as HTMLElement);

console.log(WORKFLOW_RUN_SCHEMA_VERSION);
root.render(<App />);
