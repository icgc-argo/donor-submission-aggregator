class Producer {
  sendCb: (stuff: { topic: string; messages: string[] }) => any;
  constructor({
    sendCb,
  }: {
    sendCb: (stuff: { topic: string; messages: string[] }) => any;
  }) {
    this.sendCb = sendCb;
  }

  async connect() {
    return Promise.resolve();
  }

  async send({ topic, messages }: { topic: string; messages: string[] }) {
    this.sendCb({ topic, messages });
  }

  async disconnect() {
    return Promise.resolve();
  }
}

class Consumer {
  groupId: string;
  subscribeCb: any;
  eachMessage: any;

  constructor({
    groupId,
    subscribeCb,
  }: {
    groupId: string;
    subscribeCb: (topic: string, self: Consumer) => any;
  }) {
    this.groupId = groupId;
    this.subscribeCb = subscribeCb;
  }

  getGroupId(): string {
    return this.groupId;
  }

  async connect() {
    return Promise.resolve();
  }

  async subscribe({ topic }: { topic: string }) {
    this.subscribeCb(topic, this);
  }

  async run({ eachMessage }: { eachMessage: any }) {
    this.eachMessage = eachMessage;
  }

  async disconnect() {
    return Promise.resolve();
  }
}

export default class Kafka {
  brokers: string[];
  clientId: string;
  topics: {
    [k: string]: { [k: string]: Consumer[] };
  };
  admin: any;
  logger: any;

  constructor(config: {
    brokers: string[];
    clientId: string;
    topics?: {
      [k: string]: { [k: string]: Consumer[] };
    };
  }) {
    this.brokers = config.brokers;
    this.clientId = config.clientId;
    this.topics = {};
  }

  _subscribeCb(topic: string, consumer: Consumer) {
    this.topics[topic] = this.topics[topic] || {};
    const topicObj = this.topics[topic];
    topicObj[consumer.getGroupId()] = topicObj[consumer.getGroupId()] || [];
    topicObj[consumer.getGroupId()].push(consumer);
  }

  _sendCb({ topic, messages }: { topic: string; messages: string[] }) {
    messages.forEach((message) => {
      Object.values(this.topics[topic]).forEach((consumers) => {
        const consumerToGetMessage = Math.floor(
          Math.random() * consumers.length
        );
        consumers[consumerToGetMessage].eachMessage({
          message,
        });
      });
    });
  }

  producer() {
    return new Producer({
      sendCb: this._sendCb.bind(this),
    });
  }

  consumer({ groupId }: { groupId: string }) {
    return new Consumer({
      groupId,
      subscribeCb: this._subscribeCb.bind(this),
    });
  }
}
