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

S1_PORT_NAME = 'COM6'
# S2_PORT_NAME = s1_port_name
BAUD_RATE = 115200

PACKET_SIZE = 256
ACK_BYTE = b"\x06"

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



    """ Serial Functions """

    def read_from_serial(port, packet_size):
        if port == "s1":
            s1.read(packet_size)
        #elif port == "s2":
        #    s2
        else:
            print("Error in Writing to Serial: Port not found")
            
    def write_to_serial(port, message):
        if port == "s1":
            s1.write(message.encode())
        #elif port == "s2":
        #    s2.write(message.encode())
        else:
            print("Error in Writing to Serial: Port not found")
            
    def write_to_serial_from_bin(port):
        BIN_FILE = "jtagtimeouttest.bin"

        with open(BIN_FILE, "rb") as f:
            file_data = f.read()

        num_packets = len(file_data)

        time.sleep(0.5)

        start_time = time.time()

        for i in range(num_packets):
            chunk = file_data[i * PACKET_SIZE:(i + 1) * PACKET_SIZE]
            write_to_serial(port, chunk)

            retries = 0
            while retries < 10:
                ack = port.read(1)
                if ack == ACK_BYTE:
                    print(f"ACK received for packet {i+1}")
                    break
                else:
                    retries += 1
                    print(f"No ACK for packet {i+1}, retrying {retries}/10...")
                    time.sleep(0.05)
                    port.write(chunk)

            if retries == 10:
                print(f"ERROR: Packet {i+1} failed after 10 retries. Stopping transfer.")
                break

        end_time = time.time()
        print(f"\nTransfer complete in {end_time - start_time:.2f} seconds")

    def read_from_serial_to_bin(port):
        BIN_FILE = "received_file.bin"

        with open(BIN_FILE, "wb") as f:
            received_packets = 0
            start_time = time.time()

            while True:
                chunk = read_from_serial(port, PACKET_SIZE)
                if not chunk: break

                f.write(chunk)
                received_packets += 1
                print(f"Received packet {received_packets}")

            end_time = time.time()

        write_to_serial(port, ACK_BYTE)
        print(f"\nAll packets received. ACK sent.")
        print(f"Transfer complete in {end_time - start_time:.2f} seconds.")
    
    

    """ RabbitMQ Port Creation """

    print("Creating RBMQ Connections")
    
    rabbitmq_publish = RabbitMQ()
    rabbitmq_consume = RabbitMQ()
    
    queues_created = True
    
    
    
    """ Publisher Functions """

    print("Creating Publisher")

    def send_message_to_rbmq(sending_message='Test message'):
        rabbitmq_publish.publish(queue_name=publisher_queue, message=sending_message)
        print(f"Sent message via publisher: {sending_message}")



    """ Consumer Functions """

    print("Setting Callback Functions")

    def consumer_callback(ch, method, props, body): # send to serial ports
        print(f"Received from Server: {body}")
        
        # TODO: Create Logic for serve gcs request handling
        # TODO: create serial message payload
        """ write_to_serial(s1, body) """

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
        line = s1.readline().decode().strip()
        if not line:
            continue
            
        print("Received from Pico:", line)

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
        
        
        
"""
    Modes needed:
        - Telemetry Mode
        - File Transfer Mode

    Inputs needed:
        - (Message) Type -> string
        - Message/CMD -> string
        - Params -> JSON
            - ID -> integer
            - Name -> string
            - (Optional) Telemetry Data ->
                - X Y Z axis
                - sun location
                - health of the system
                - current tempurate
                - voltage level
                - current level
                - battery level
                - movement data
                - location
                - heat
            - (Optional) File Transfer Data
                - Packet Payload
                
"""

