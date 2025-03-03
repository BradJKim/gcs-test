from classes.rabbitmq import RabbitMQ
import time

print("Creating Consumer")

def callback_function(ch, method, props, body):
    print(f"Received {body}")
    
rabbitmq_consume = RabbitMQ()
rabbitmq_consume.consume(queue_name="serial_queue", callback=callback_function)


print("Creating Publisher...")

rabbitmq_publish = RabbitMQ()

while True:
    message = 'Test message'
    rabbitmq_publish.publish(message)
    print(f"Sent message: {message}")
    rabbitmq_publish.close()
    time.sleep(10)
