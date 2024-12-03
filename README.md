# Purpose
The code contained in this repository is used to retrieve github actions workflows usage data.

The reason behind the creation of this tool was :
* to gather data about actions runs
* to only retrieving new run usage data (after the initial data fetching)
* to aggregate job runs data over a selected period

# Installation
Open the project root inside your terminal then :
```bash
nvm install
yarn install
```
# Usage
As the cli uses `commander.js` under the hood you can use the `--help` parameter to display commands and their arguments
```bash
yarn run start:cli --help
# this should output the following

Usage: github-actions-stats [options] [command]

Options:
  -t, --github-token <githubToken>  Github token
  -h, --help                        display help for command

Commands:
  get-workflow-runs [options]       Get workflow runs data
  get-aggregated-stats [options]    Get aggregated stats
  help [command]                    display help for command               display help for command

# to get more info about a command just add it's name to the previous command
yarn run start:cli:tsx get-workflow-runs --help 

Usage: github-actions-stats get-workflow-runs [options]

Get workflow runs data

Options:
  --workflowName <workflowName>        Workflow name
  --repositoryName <repositoryName>    Repository name
  --repositoryOwner <repositoryOwner>  Repository owner
  --branchName [branchName]            Branch name (default: "trunk")
  --localOnly [localOnly]              Only load local data (default: false)
  --filePath <filePath>                File path to save data
  -h, --help                           display help for command
```

## Examples
### Get workflow runs data
```bash
# this will retrieve workflow runs data for the Continuous Integration workflow
yarn run start:cli:tsx get-workflow-runs \
  -t "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  --workflowName "Continuous Integration" \
  --repositoryName "github-actions-stats" \
  --repositoryOwner "payouri" \
  --filePath "/home/youri/.../continous_integration/ci_workflow_runs.json"
```
### Get aggregated stats
```bash
# this will aggregate workflow runs data for the Continuous Integration workflow previously retrieved
yarn run start:cli:tsx get-aggregated-stats
  -t "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  --period "month" \
  --workflowDataFile "/home/youri/.../continous_integration/ci_workflow_runs.json" \
  --outputFile "/home/youri/.../continous_integration/ci_aggregated_stats.json"

```