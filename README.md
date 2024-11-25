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
