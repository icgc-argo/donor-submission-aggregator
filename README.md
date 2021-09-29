# donor-submission-aggregator

[![Build Status](https://jenkins.qa.cancercollaboratory.org/buildStatus/icon?job=ARGO%2Fdonor-submission-aggregator%2Fdevelop)](https://jenkins.qa.cancercollaboratory.org/job/ARGO/job/donor-submission-aggregator/job/develop/)

Donor aggregation service for the ICGC-ARGO Submission System

## What it does:

- Aggregates RDPC analyses to donor centric structure.
- Reads program clinical data from mongoDB and indexes it
- Indexes donor centric RDPC data and clinical data into ElasticSearch, index name follows this pattern: `donor_centric_program_<programId>_re_<releaseNum>`

## How to:

- Make sure to have `.env` file correctly filled in with configurations, refer to `.schema.env` file for examples.

- run `docker-compose -f docker-compose.yml up -d` to start all dependencies.

- run `npm run start::dev` to start the application. Or run `npm run start::debug` to start debugger.

## Post Messages to Kafka Topics:

There are four kafka topics: `PROGRAM_UPDATE`, `song_analysis`, `donor_aggregator_program_queues`, and `donor_aggregator_dlq`.
For local devlopment, you can post messages to trigger indexing:

- for `PROGRAM_UPDATE`: make a `POST` to `http://localhost:8082/topics/PROGRAM_UPDATE`, request body can be:

```
{
 "records": [
   {
     "key": "PACA-CA",
     "value":
     {
       "type": "CLINICAL",
       "programId": "PACA-CA"
     }
   }
 ]
}
```

- for `song_analysis`, there are 2 types of messages:
- Type 1:
  - Message to index the entire program
  - How to post a test message: make a `POST` request to `http://localhost:8082/topics/song_analysis`, must provide `studyId` and `type` in request body:

```
{
 "records":
 [
   {
       "key": "PACA-CA",
       "value": {
           "type": "RDPC",
           "studyId": "PACA-CA"
       }
   }
 ]
}
```

- Type 2: Incremental update:
  - Message to update certain donors within a program
  - Must include `studyId`, `analysisId` in the request body

```
{
"records":
[
  {
      "key": "ROSI-RU",
      "value": {
          "analysisId": "6e2cdfbe-59bb-4c7c-acdf-be59bb7c7c26",
          "studyId" : "ROSI-RU",
          "state" : "UNPUBLISHED",
          "action" : "PUBLISH",
          "songServerId" : "song.collab"
      }
  }
]
}
```

- for `donor_aggregator_program_queues`, a sample message looks like:

```
{
  "topic": "donor_aggregator_program_queues",
  "key": "OCCAMS-GB",
  "value": "{
    "programId":"OCCAMS-GB",
    "type":"SYNC",
    "rdpcGatewayUrls": ["https://api.rdpc.cancercollaboratory.org/graphql"]
  }"
}
```

- Topic `donor_aggregator_program_queues` stores messages collected from `PROGRAM_UPDATE` and `song_analysis`.

- Topic `donor_aggregator_dlq` is the dead letter queue for malformatted/invalid messages.

## Three Kafka Events

- CLINICAL

This event is published by argo-clinical service, donor aggregator listens to topic `PROGRAM_UPDATE` for new events and starts indexing the program clinical data.

-

* RDPC

This event is published by RDPC, donor aggregator listens to topic `song_analysis` for new events and starts querying RDPC API for analyses data, when complete, it starts indexing the entire program if no `analysis_id` is provided in the message.

- SYNC

This event can be published manually by directly sending messages to topic `donor_aggregator_program_queues` or by this endpoint: https://donor-submission-aggregator.qa.argo.cancercollaboratory.org/api-docs/#/Index%20Program/post_index_program__program_id_.
SYNC event triggers index on both clinical and RDPC data. It does not clone the existing index, instead generating a new index and populating it with the current donors available from the Clinical service.
