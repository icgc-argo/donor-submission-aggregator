import { KafkaTopicConfiguration } from 'config';
import { Kafka } from 'kafkajs';
import logger from 'logger';

const createTopic = async (kafka: Kafka, config: KafkaTopicConfiguration) => {
	const topic = config.topic;
	const numPartitions = config.partitions;
	logger.info(`creating topic "${topic}" with ${numPartitions} partitions`);
	const kafkaAdmin = kafka.admin();
	try {
		await kafkaAdmin.connect();
		logger.info('connected kafka admin');
		const isTopicCreated = await kafkaAdmin.createTopics({
			topics: [
				{
					topic,
					numPartitions,
				},
			],
		});
		await kafkaAdmin.disconnect();
		if (isTopicCreated) {
			logger.info(`topic "${topic}" has been created`);
		}
	} catch (err) {
		logger.error(`Error occured when creating topic "${topic}"`);
		throw err;
	}
};

export default createTopic;
