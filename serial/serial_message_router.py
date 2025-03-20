# depending on listen message from consumer or gets message from com7
# consumer -> write to port.
# port -> write to publisher.

from classes.rabbitmq import RabbitMQ
from utils.port_finder import list_connected_ports
from utils.message_packer import *
from utils.serial_wrapper import *

import serial
import time
import sys
import threading
import json


S1_PORT_NAME = 'COM6'
# S2_PORT_NAME = s1_port_name
BAUD_RATE = 115200

consumer_queue = "serial_queue"
publisher_queue = "server_queue"

ports_created = False
queues_created = False
start_thread = False
    
try:
    """ Serial Port Initialization """
    print("Syncing Ports")

    ports = list_connected_ports()

    if (S1_PORT_NAME not in ports ): # or s2_port_name not in ports
        print("Listed Serial port not found, unable to create ")
        print("Run port_finder.py to manually search for open Serial Ports")
        sys.exit()

    s1 = serial.Serial(S1_PORT_NAME, baudrate=BAUD_RATE, timeout=1)
    # s2 = serial.Serial(s2_port_name)
    
    ports_created = True
    time.sleep(1)  # Allow Pico to initialize
    s1.reset_input_buffer()
    
    

    """ RabbitMQ Port Creation """
    print("Creating RBMQ Connections")
    
    rabbitmq_publish = RabbitMQ()
    rabbitmq_consume = RabbitMQ()
    
    queues_created = True
    
    def send_message_to_rbmq(sending_message='Test message'):
        rabbitmq_publish.publish(queue_name=publisher_queue, message=sending_message)
        print(f"Sent message via publisher: {sending_message}")
    
    
    
    """ Callback Functions """
    
    def consumer_callback(ch, method, props, body): # send to serial ports
        print(f"Received from Server: {body}")
        
        # TODO: Create Logic for serve gcs request handling
        # TODO: create serial message payload
        # port.write(message.encode())

    def serial_callback(body): # send to RabbitMQ
        # TODO: Create Logic for serial response handling
        # TODO: create rbmq message Payload
        send_message_to_rbmq(sending_message=body)



    """ Consumer Initialization """
    print("Creating Consumer Thread")
        
    consumer_thread = threading.Thread(target=rabbitmq_consume.consume,
                                        args=(consumer_queue, consumer_callback))
    consumer_thread.start()
    start_thread = True
    
    
    
    """ Serial Listener Initialization """
    print("Activating Serial Listeners:")

    while True:
        packet = s1.readline().decode().strip()
        
        if not packet: continue
        print("Received from Pico:", packet)
        
        if len(packet) == 128:
            telemetry = packet_telemetry(packet)
        else:
            telemetry = { 'status': 'failure' }
            

        # if received serial message requires multiple serial messages:
        #   read_from_serial_to_bin("s1")
        # else: serial_callback(line)
        
        
        # test continuous sending from python script
        data = {'type': 'ping'}
        json_data = json.dumps(data)
        serial_callback(str(json_data))
                
        time.sleep(2)

finally:
    print("\nSTOP PROGRAM - Closing Ports/Connections:")
    
    if ports_created:
        if s1.is_open:  s1.close()
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