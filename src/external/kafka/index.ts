/*
 * Copyright (c) 2020 The Ontario Institute for Cancer Research. All rights reserved
 *
 * This program and the accompanying materials are made available under the terms of
 * the GNU Affero General Public License v3.0. You should have received a copy of the
 * GNU Affero General Public License along with this program.
 *  If not, see <http://www.gnu.org/licenses/>.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 * SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import { kafkaConfig } from 'config';
import { Kafka, KafkaConfig } from 'kafkajs';
import logger from '../../logger';
import clinicalUpdateConsumer from './consumers/clinicalUpdateConsumer';
import filePublicReleaseConsumer from './consumers/filePublicReleaseConsumer';
import programQueueConsumer from './consumers/programQueueConsumer';
import rdpcAnalysisUpdateConsumer from './consumers/rdpcAnalysisUpdateConsumer';
import * as programQueueProducer from './producers/programQueueProducer';
import createTopic from './createTopic';

const consumers = [
	programQueueConsumer,
	clinicalUpdateConsumer,
	filePublicReleaseConsumer,
	rdpcAnalysisUpdateConsumer,
];

export const setup = async (
	config: KafkaConfig = {
		clientId: 'donor-submission-aggregator',
		brokers: kafkaConfig.brokers,
	},
): Promise<void> => {
	const kafka = new Kafka(config);

	logger.info('Initializing Kafka connections...');
	await Promise.all([
		createTopic(kafka, kafkaConfig.topics.programQueue),
		...consumers.map((consumer) => consumer.init(kafka)),
		programQueueProducer.init(kafka),
	]);
	logger.info('Connected.');
};

export const disconnect = async () => {
	logger.warn('Disconnecting all from Kafka...');
	await Promise.all(consumers.map((consumer) => consumer.disconnect()));
	logger.warn('Disconnected.');
};
