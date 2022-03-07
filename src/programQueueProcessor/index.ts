import { KafkaMessage } from "kafkajs";
import logger from "logger";
import processClinicalUpdateEvent from "./processClinical";
import { KnownEventType, QueueRecord } from "./types";

// const analysesFetcher = fetchAnalyses;
// const analysesWithSpecimensFetcher = fetchAnalysesWithSpecimens;
// const fetchVC = fetchVariantCallingAnalyses;
// const fetchDonorIds = fetchDonorIdsByAnalysis;
// const fileData = getFilesByProgramId;

async function handleEventMessage(
  message: KafkaMessage,
  sendDlqMessage: (messageJSON: string) => Promise<void>
) {
  const stringMessage = message.value?.toString() || "";
  try {
    const queuedEvent = JSON.parse(stringMessage) as QueueRecord;

    logger.info(`Begin processing event: ${queuedEvent.type}`);
    switch (queuedEvent.type) {
      case KnownEventType.CLINICAL:
        processClinicalUpdateEvent(queuedEvent, sendDlqMessage);
        break;
      case KnownEventType.RDPC:
        break;
      case KnownEventType.SYNC:
        break;
      case KnownEventType.FILE_RELEASE:
        break;
    }
  } catch (err) {
    logger.error(`Failed to process queued event`, err);
    sendDlqMessage(stringMessage);
  }
}
//   const { programId } = queuedEvent;

//   // statusReporter?.startProcessingProgram(programId);

//   const esClient = await getEsClient();
//   const rollCallClient = await createRollcallClient(rollcallConfig);

//   // For sync events we want to regenerate the entire index, so do not clone.
//   // Clone for all other event types (RDPC and CLINICAL)
//   const doClone = queuedEvent.type !== KnownEventType.SYNC;

//   try {
//     // No await on the withRetry():
//     //  we need this method to return to the kafka consumer immediately so that this long running process doesn't
//     //  disconnect the consumer group from the kafka broker.
//     withRetry(async (retry, attemptIndex) => {
//       const newResolvedIndex = await getNewResolvedIndex(
//         programId,
//         esClient,
//         rollCallClient,
//         doClone
//       );
//       const targetIndexName = newResolvedIndex.indexName;

//       try {
//         await setIndexWritable(esClient, targetIndexName, true);
//         logger.info(`Enabled index writing for: ${targetIndexName}`);
//         switch (queuedEvent.type) {
//           case KnownEventType.CLINICAL:
//             // Re-index all of clinical for this program.
//             // Ideally, this would only update only the affected donors - an update to clinical is required to communicate this information in the kafka event.
//             await indexClinicalData(programId, targetIndexName, esClient);
//             break;

//           case KnownEventType.FILE_RELEASE:
//             if (FEATURE_INDEX_FILE_ENABLED) {
//               const programs: Program[] = queuedEvent.programs;
//               for (const program of programs) {
//                 await indexFileData(
//                   programId,
//                   fileData,
//                   targetIndexName,
//                   esClient,
//                   program.donorsUpdated
//                 );
//               }
//             }
//             break;

//           case KnownEventType.RDPC:
//             // Update RDPC data. Analysis ID is expected in the event so only documents affected by that analysis will be updated.
//             for (const rdpcUrl of queuedEvent.rdpcGatewayUrls) {
//               await indexRdpcData({
//                 programId,
//                 rdpcUrl,
//                 targetIndexName,
//                 esClient,
//                 analysesFetcher,
//                 analysesWithSpecimensFetcher,
//                 fetchVC,
//                 fetchDonorIds,
//                 analysisId: queuedEvent.analysisId,
//               });
//             }
//             break;
//           case KnownEventType.SYNC:
//             // Generate Clinical and RPDC data for all analyses. We expect an empty index here (doClone = false)
//             // so all donor data for this program needs to be gathered and added before release.
//             await indexClinicalData(programId, targetIndexName, esClient);
//             for (const rdpcUrl of queuedEvent.rdpcGatewayUrls) {
//               await indexRdpcData({
//                 programId,
//                 rdpcUrl,
//                 targetIndexName: targetIndexName,
//                 esClient,
//                 analysesFetcher,
//                 analysesWithSpecimensFetcher,
//                 fetchVC,
//                 fetchDonorIds,
//               });
//             }

//             if (FEATURE_INDEX_FILE_ENABLED) {
//               await indexFileData(
//                 programId,
//                 fileData,
//                 targetIndexName,
//                 esClient
//               );
//             }
//             break;
//         }
//         logger.info(`Releasing index: ${targetIndexName}`);
//         await rollCallClient.release(newResolvedIndex);
//       } catch (err) {
//         logger.warn(
//           `Failed to index program ${programId} on attempt #${attemptIndex}: ${err}`
//         );
//         await handleIndexingFailure({
//           esClient,
//           targetIndexName,
//         });
//         retry(err);
//       }

//       await setIndexWritable(esClient, targetIndexName, false);
//       logger.info(`Disabled index writing for: ${targetIndexName}`);
//       // statusReporter?.endProcessingProgram(programId);
//     }, RETRY_CONFIG_RDPC_GATEWAY);
//   } catch (err) {
//     // statusReporter?.endProcessingProgram(programId);
//     logger.error(
//       `Failed to index program ${programId} after ${
//         RETRY_CONFIG_RDPC_GATEWAY.retries
//       } attempts: ${JSON.stringify(err)}`,
//       err
//     );
//     // Message processing failed, make sure it is sent to the Dead Letter Queue.
//     sendDlqMessage(stringMessage);
//   }
// }

export default handleEventMessage;
