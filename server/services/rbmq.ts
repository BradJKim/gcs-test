// rabbitmq calls here
// https://www.rabbitmq.com/tutorials/tutorial-one-javascript

// global variable channel in server.ts
import amqp, { Channel } from 'amqplib/callback_api'

const username = process.env.RABBITMQ_USER;
const password = process.env.RABBITMQ_PASS;
const port = process.env.RABBITMQ_PORT;

const URL = `amqp://${username}:${password}@localhost:${port}`;

let rbmqChannel: Channel;

amqp.connect(URL, (err, connection) => {
  if (err) {
    console.error('Failed to connect to RabbitMQ', err);
    return;
  }

  connection.createChannel((err, ch) => {
    if (err) {
      console.error('Failed to create RabbitMQ channel', err);
      return;
    }

    rbmqChannel = ch;
    const queue = 'websocket_queue';

    rbmqChannel.assertQueue(queue, { durable: false });

    console.log('RabbitMQ connection established');
  });
});

export { rbmqChannel };