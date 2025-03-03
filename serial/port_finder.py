import serial
import serial.tools.list_ports

def list_connected_ports():
    # Get a list of all available serial ports
    ports = serial.tools.list_ports.comports()

    connected_ports = []
    
    for port in ports:
        print(f"Port: {port.device}, Description: {port.description}")
        try:
            connected_ports.append(port.device)
        except serial.SerialException as e:
            print("Error opening port")
            continue
    
    return connected_ports

connected_ports = list_connected_ports()
print(f"Connected serial ports: {connected_ports}")