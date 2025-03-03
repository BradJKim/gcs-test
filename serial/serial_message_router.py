# depending on listen message from consumer or gets message from com7
# consumer -> write to port.
# port -> write to publisher.

from classes.rabbitmq import RabbitMQ
from serial.port_finder import list_connected_ports
import serial
import time

s1_port_name = 'COM7'
s2_port_name = s1_port_name


try:
    """ Serial Port Initialization """

    print("Syncing Ports...")

    ports = list_connected_ports()

    if (s1_port_name not in ports or s2_port_name not in ports):
        print("Listed Serial port not found, unable to create ")
        print("Run port_finder.py to manually search for open Serial Ports")
        exit()

    s1 = serial.Serial(s1_port_name)
    s2 = serial.Serial(s2_port_name)

    def write_to_serial(port, message):
        if port == s1_port_name:
            s1.write(message.encode())
        elif port == s2_port_name:
            s2.write(message.encode())
        else:
            print("Error in Writing to Serial: Port not found")
        


    """ Publisher Initization """

    print("Creating Publisher...")

    rabbitmq_publish = RabbitMQ()

    def send_message_to_rbmq(message='Test message'):
        rabbitmq_publish.publish(message)
        print(f"Sent message: {message}")
        rabbitmq_publish.close()



    """ Callback Functions """

    print("Setting Callback Functions...")

    def consumer_callback(ch, method, props, body):
        print(f"Received {body}")
        
        # TODO: create serial message
        write_to_serial(s1, body)

    def serial_callback(message):
        print(f"Received {message}")
        
        # TODO: create rbmq message
        send_message_to_rbmq(message)



    """ Consumer Initialization """

    print("Creating Consumer...")
        
    rabbitmq_consume = RabbitMQ()
    rabbitmq_consume.consume(queue_name="serial_queue", callback=consumer_callback)



    """ Serial Listener Initialization """

    print("Setting Serial Listeners...")

    while True:
        res = s1.read()
        serial_callback(res)
        
        time.sleep(2) # optional change time

finally:
    if s1.is_open:  s1.close()
    if s2.is_open:  s2.close()
    print("Serial Ports Closed")
    
    rabbitmq_consume.close()
    rabbitmq_publish.close()
    print("RabbitMQ Connections Closed")