import { spawnSync } from "node:child_process";
import migrationJSON from "./migrations.json" with { type: "json" };
import getScripts from "./scripts/scripts.js";

const { patches } = migrationJSON;

async function migrations() {
    const scripts = await getScripts();
    
    patches.forEach((patch) => {
        console.log(patch.scripts);
        for (const script of patch.scripts) {
            const scriptPath = scripts.get(script);
            if (!scriptPath) {
                throw new Error(`Script ${script} not found`);
            }
            const isTsFile = scriptPath.endsWith(".ts");

            spawnSync(isTsFile ? "tsx" : "node", [scriptPath], {
                stdio: "inherit",
            });
        }
    });
}

migrations()
