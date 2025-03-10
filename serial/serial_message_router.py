# depending on listen message from consumer or gets message from com7
# consumer -> write to port.
# port -> write to publisher.

from classes.rabbitmq import RabbitMQ
from port_finder import list_connected_ports
import serial
import time
import sys
import threading
import json

s1_port_name = 'COM6'
# s2_port_name = s1_port_name

consumer_queue = "serial_queue"
publisher_queue = "server_queue"

ports_created = False
queues_created = False
start_thread = False
    
try:
    """ Serial Port Initialization """

    """ print("Syncing Ports")

    ports = list_connected_ports()

    if (s1_port_name not in ports ): # or s2_port_name not in ports
        print("Listed Serial port not found, unable to create ")
        print("Run port_finder.py to manually search for open Serial Ports")
        sys.exit()

    s1 = serial.Serial(s1_port_name, baudrate=115200, timeout=1)
    # s2 = serial.Serial(s2_port_name)
    
    ports_created = True

    def write_to_serial(port, message):
        if port == s1_port_name:
            s1.write(message.encode())
        #elif port == s2_port_name:
        #    s2.write(message.encode())
        else:
            print("Error in Writing to Serial: Port not found")
         """


    """ RabbitMQ Port Creation """

    print("Creating RBMQ Connections")
    
    rabbitmq_publish = RabbitMQ()
    rabbitmq_consume = RabbitMQ()
    
    queues_created = True
    
    
    
    """ Publisher Initization """

    print("Creating Publisher")

    def send_message_to_rbmq(sending_message='Test message'):
        rabbitmq_publish.publish(queue_name=publisher_queue, message=sending_message)
        print(f"Sent message via publisher: {sending_message}")



    """ Callback Functions """

    print("Setting Callback Functions")

    def consumer_callback(ch, method, props, body):
        print(f"Received from Server: {body}")
        
        # TODO: create serial message
        """ write_to_serial(s1, body) """

    def serial_callback(body):
        
        # TODO: create rbmq message
        send_message_to_rbmq(sending_message=body)



    """ Consumer Initialization """

    print("Creating Consumer Thread")
        
    consumer_thread = threading.Thread(target=rabbitmq_consume.consume, args=(consumer_queue, consumer_callback))
    consumer_thread.start()
    start_thread = True
    
    
    """ Serial Listener Initialization """

    print("Activating Serial Listeners:")

    while True:
        """ line = s1.readline().decode().strip()
        if line:
            print("Received from Pico:", line)
        
        serial_callback(line) """
        
        data = {'type': 'ping'}
        json_data = json.dumps(data)
        
        serial_callback(str(json_data))
                
        time.sleep(2) # optional change time

finally:
    print("\nSTOP PROGRAM - Closing Ports/Connections:")
    
    if ports_created:
        """ if s1.is_open:  s1.close() """
        # if s2.is_open:  s2.close()
        print("Serial Ports Closed")
    
    if queues_created:
        rabbitmq_publish.close()
        print("Publisher Connection closed")
        
    if start_thread:
        rabbitmq_consume.stop()
        print("Consumer Connection closed.")
        consumer_thread.join(timeout=1)
        print("Consumer Thread Stopped\n")