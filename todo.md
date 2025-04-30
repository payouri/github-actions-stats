# Global
* ~~set clear boundaries between cli and server~~
* add tests
* use the same helpers to generate runs and workflow ids
* ~~review data structure of workflow runs~~
    * run details are deeply nested
* redo ReadMe
* better identifiers for workflow and runs
    * ~~keys are case insensitive~~
    * workflow keys use workflow id instead of name
* add run start time and end time to workflow runs
* ~~fix total count not being updated~~

# Server
* rework workflow routes
    * ~~separate processing workflows and route body~~
* stop using WorkflowInstance for data handling / allow to fecth workflows and runs independently
* give options to protect api
* ~~implement workers to process workflow runs~~

# CLI
* ~~use better storage implementaion~~
* make interface more friendly
* rework and re-enable cli
    * ~~fetchNewWorkflowRunsCommand reimplemented~~
    * generate StatsCommand reimplemented

# Frontend
* merge this repo with the stat viewer repo
* connect api

# Tools
* ~~add fix local workflow runs ids array~~
* add script to fix runs total count in db
* add migration system
  * cli with ui ?
  * version in storage (implemented on mongo)
  * migrations json schema
* tool to import and export from a storage to another

# Mongo
* indexes
* up one level usage and jobs data

# Github
* add tests data to mock calls
* cleanup old request/controller system