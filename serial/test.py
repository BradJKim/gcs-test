import pika

try:
    print("Attempting to connect to RabbitMQ...")
    connection = pika.BlockingConnection(pika.ConnectionParameters(host='localhost', port=5672, credentials=pika.PlainCredentials('guest', 'guest')))
    print("✅ Connected to RabbitMQ!")

    channel = connection.channel()
    x = channel.queue_declare(queue='server_queue', durable=True)
    print(x)
    channel.basic_publish(exchange='',
                          routing_key='server_queue',
                          body='Hello, RabbitMQ!',
                          properties=pika.BasicProperties(
                              delivery_mode=2,  # Make the message persistent
                          ))
    print("✅ Message sent!")
    
    connection.close()

except Exception as e:
    print(f"❌ Failed to connect: {e}")
