import { kafkaConfig, KafkaConsumerConfiguration } from "config";
import { Consumer, Kafka, KafkaMessage, Producer } from "kafkajs";
import logger from "logger";

type KafkaConsumerWrapper = {
  init: (kafka: Kafka) => Promise<void>;
  disconnect: () => Promise<void>;
  sendDlqMessage: (messageJSON: string) => Promise<void>;
  config: KafkaConsumerConfiguration;
  consumer?: Consumer;
  dlqProducer?: Producer;
};

function createConsumer(
  config: KafkaConsumerConfiguration,
  messageHandler: (
    message: KafkaMessage,
    sendDlqMessage: (messageJSON: string) => Promise<void>
  ) => Promise<void>
): KafkaConsumerWrapper {
  let consumer: Consumer | undefined;
  let dlqProducer: Producer | undefined;

  /**
   * Call on startup to create the consumer
   *  */
  const init = async (kafka: Kafka) => {
    consumer = kafka.consumer({
      groupId: config.group,
      heartbeatInterval: config.heartbeatInterval,
      sessionTimeout: config.sessionTimeout,
      rebalanceTimeout: config.rebalanceTimeout,
    });
    consumer.subscribe({
      fromBeginning: false,
      topic: config.topic,
    });
    await consumer.connect();

    const dlqTopic = config.dlq;
    if (dlqTopic) {
      dlqProducer = kafka.producer({
        allowAutoTopicCreation: true,
      });
      await dlqProducer.connect();
    }

    await consumer
      .run({
        partitionsConsumedConcurrently: config.partitionsConsumedConcurrently,
        eachMessage: async ({ message }) => {
          logger.info(`New message received offset : ${message.offset}`);
          await handleMessage(message, sendDlqMessage);
          logger.debug(`Message handled ok`);
        },
      })
      .catch((e) => {
        logger.error("Failed to run consumer " + e.message, e);
        throw e;
      });
  };

  /**
   * Call on program terminate to disconnect
   *  */
  const disconnect = async () => {
    await consumer?.disconnect();
    await dlqProducer?.disconnect();
  };

  const sendDlqMessage = async (messageJSON: string) => {
    if (config.dlq && dlqProducer) {
      const result = await dlqProducer?.send({
        topic: config.dlq,
        messages: [
          {
            value: JSON.stringify(messageJSON),
          },
        ],
      });
      logger.debug(
        `DLQ message sent to ${config.dlq}. response: ${JSON.stringify(result)}`
      );
    } else {
      logger.warn(
        `No DLQ configured for ${config.topic} consumer. Not sending message to a DLQ.`
      );
    }
  };

  /**
   * Wrapper for the provided messageHandler, will catch all errors and send DLQ message if a DLQ topic is provided in the config
   * @param message
   */
  async function handleMessage(
    message: KafkaMessage,
    sendDlqMessage: (messageJSON: string) => Promise<void>
  ) {
    try {
      await messageHandler(message, sendDlqMessage);
    } catch (err) {
      logger.error(
        `Failed to handle program queue message, offset: ${message.offset}`,
        err
      );

      const msg = message.value
        ? JSON.parse(message.value.toString())
        : { message: `invalid body, original offset: ${message.offset}` };
      await sendDlqMessage(msg);
    }
  }

  return { init, disconnect, sendDlqMessage, config, consumer, dlqProducer };
}

export default createConsumer;
