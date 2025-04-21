# Global
* ~~set clear boundaries between cli and server~~
* add tests
* use the same helpers to generate runs and workflow ids
* ~~review data structure of workflow runs~~
    * run details are deeply nested
* redo ReadMe

# Server
* rework workflow routes
    * separate processing workflows and toute body
* stop using WorkflowInstance for data handling / allow to fecth workflows and runs independently
* give options to protect api
* implement workers to process workflow runs

# CLI
* ~~use better storage implementaion~~
* make interface more friendly
* rework and re-enable cli

# Frontend
* merge this repo with the stat viewer repo
* connect api

# Mongo
* indexes
* up one level usage and jobs data

# Github
* add tests data to mock calls
* cleanup old request/controller system