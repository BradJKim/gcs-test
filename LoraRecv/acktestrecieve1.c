#include <stdio.h>
#include <string.h>
#include "pico/stdlib.h"
#include "hardware/spi.h"
#include "hardware/gpio.h"
#include "hardware/sync.h"
#include "pico/mutex.h"
#include "pico/multicore.h"

#define SPI_PORT spi1
#define PIN_SCK 10
#define PIN_MISO 12
#define PIN_MOSI 11
#define PIN_NSS 13
#define PIN_RST 15
#define PIN_DIO0 14

#define ACK_EVERY_N_PACKETS 5  // Change this value to modify ACK frequency
volatile bool last_packet_received = false; // Flag to indicate last packet
#define LAST_PACKET_TAG 0xFFFF  // Special tag to mark the last packet
volatile uint16_t expected_packet_id = 0; // Tracks expected sequence number

volatile char received_message[64];  
volatile int packet_received = 0;
volatile int packet_count = 0;
volatile int chunk_count = 0;  // Track how many packets have been received


#define BUFFER_SIZE 16 // Number of packets that can be queued
#define PACKET_SIZE 128 // Packet size in bytes
#define CHUNK_SIZE 5  // Number of packets per chunk

// Front-Back Buffers
uint8_t front_buffer[BUFFER_SIZE][PACKET_SIZE];  
uint8_t back_buffer[BUFFER_SIZE][PACKET_SIZE];
// Declare pointers to buffers
uint8_t (*front_buffer_ptr)[PACKET_SIZE] = front_buffer;
uint8_t (*back_buffer_ptr)[PACKET_SIZE] = back_buffer;


// Control Variables
volatile int front_index = 0;  // Current index in front buffer
volatile bool buffer_ready = false;  // Flag to signal Core 1

// Mutex for safe buffer swapping
mutex_t buffer_mutex;

#define FIFO_SIZE 32  // Maximum packets stored in FIFO


typedef struct {
    uint8_t buffer[FIFO_SIZE][PACKET_SIZE]; // Circular buffer
    volatile int head;  // Points to next available slot
    volatile int tail;  // Points to next packet to process
    volatile int count; // Number of packets in FIFO
    mutex_t fifo_mutex; // Mutex for thread safety
} fifo_queue_t;

fifo_queue_t packet_fifo;

void fifo_init(fifo_queue_t *q) {
    q->head = 0;
    q->tail = 0;
    q->count = 0;
    mutex_init(&q->fifo_mutex);
}


void spi_init_pico();
void sx1278_reset();
void sx1278_write_register(uint8_t reg, uint8_t value);
uint8_t sx1278_read_register(uint8_t reg);
void lora_init();
void lora_receive();
void lora_send_ack();
void on_lora_rx_done(uint gpio, uint32_t events);
void setup_lora_interrupt();

void spi_init_pico() {
    spi_init(SPI_PORT, 500 * 1000);
    gpio_set_function(PIN_SCK, GPIO_FUNC_SPI);
    gpio_set_function(PIN_MOSI, GPIO_FUNC_SPI);
    gpio_set_function(PIN_MISO, GPIO_FUNC_SPI);

    gpio_init(PIN_NSS);
    gpio_set_dir(PIN_NSS, GPIO_OUT);
    gpio_put(PIN_NSS, 1);

    gpio_init(PIN_RST);
    gpio_set_dir(PIN_RST, GPIO_OUT);
    gpio_put(PIN_RST, 1);
}

void sx1278_reset() {
    gpio_put(PIN_RST, 0);
    sleep_ms(10);
    gpio_put(PIN_RST, 1);
    sleep_ms(10);
}

void sx1278_write_register(uint8_t reg, uint8_t value) {
    uint8_t data[2] = {reg | 0x80, value};
    gpio_put(PIN_NSS, 0);
    spi_write_blocking(SPI_PORT, data, 2);
    gpio_put(PIN_NSS, 1);
}

uint8_t sx1278_read_register(uint8_t reg) {
    uint8_t value;
    gpio_put(PIN_NSS, 0);
    spi_write_blocking(SPI_PORT, &reg, 1);
    spi_read_blocking(SPI_PORT, 0, &value, 1);
    gpio_put(PIN_NSS, 1);
    return value;
}

void lora_init() {
    sx1278_reset();
    sx1278_write_register(0x01, 0x80); // Set LoRa mode
    sx1278_write_register(0x09, 0xFF); // Set max power
    sx1278_write_register(0x0E, 0x00); // Set FIFO TX base address
    sx1278_write_register(0x0F, 0x00); // Set FIFO RX base address
    sx1278_write_register(0x1D, 0x72); // Modem Config 1
    sx1278_write_register(0x1E, 0x74); // Modem Config 2
    sx1278_write_register(0x01, 0x85); // Set to RX continuous mode
}

void setup_lora_interrupt() {
    gpio_init(PIN_DIO0);
    gpio_set_dir(PIN_DIO0, GPIO_IN);
    gpio_pull_down(PIN_DIO0);
    gpio_set_irq_enabled_with_callback(PIN_DIO0, GPIO_IRQ_EDGE_RISE, true, &on_lora_rx_done);
}

bool is_last_packet(uint8_t *packet) {
    uint16_t tag = (packet[0] << 8) | packet[1];
    return (tag == LAST_PACKET_TAG);
}

void on_lora_rx_done(uint gpio, uint32_t events) {
    if (gpio == PIN_DIO0) {
        packet_received = 1;
        packet_count++;

        uint8_t len = sx1278_read_register(0x13);
        sx1278_write_register(0x0D, sx1278_read_register(0x10)); // Set FIFO pointer

        static uint8_t local_buffer[CHUNK_SIZE][PACKET_SIZE]; 
        static int local_index = 0;  

        // Store packet in local buffer
        for (int i = 0; i < len && i < PACKET_SIZE; i++) {
            local_buffer[local_index][i] = sx1278_read_register(0x00);
        }

        // Extract sequence number from first 2 bytes
        uint16_t packet_id = (local_buffer[local_index][0] << 8) | local_buffer[local_index][1];

        printf("📡 Received Packet ID=%d, Expected=%d, Data: %s\n", 
               packet_id, expected_packet_id, local_buffer[local_index] + 2);

        // ✅ Detect if this is the last packet
        if (packet_id == LAST_PACKET_TAG) { 
            // Extract previous packet ID stored in next 2 bytes
            uint16_t prev_packet_id = (local_buffer[local_index][2] << 8) | local_buffer[local_index][3];

            // ✅ Only accept last packet if the previous one was received
            if (prev_packet_id == expected_packet_id - 1) {
                last_packet_received = true;
                printf("✅ Last Packet Received in Order! Preparing final ACK...\n");
            } else {
                printf("⚠️ Last Packet Arrived Early! Waiting for Packet ID=%d\n", prev_packet_id);
                return; // Ignore last packet until its previous packet is received
            }
        }

        // ✅ Check if the packet is in the correct sequence
        if (packet_id == expected_packet_id || packet_id == LAST_PACKET_TAG) {
            expected_packet_id++; // Move to the next expected packet
            local_index++;
        } else {
            printf("⚠️ Out-of-Order Packet Received! Expected %d but got %d. Ignoring...\n", 
                   expected_packet_id, packet_id);
            return; // Ignore this packet and do not increase local_index
        }

        // ✅ When local buffer reaches CHUNK_SIZE or last packet, transfer to FIFO
        if (local_index >= CHUNK_SIZE || last_packet_received) {
            mutex_enter_blocking(&packet_fifo.fifo_mutex);

            for (int i = 0; i < local_index; i++) {
                if (packet_fifo.count < FIFO_SIZE) {
                    int index = packet_fifo.head;
                    memcpy(packet_fifo.buffer[index], local_buffer[i], PACKET_SIZE);

                    packet_fifo.head = (packet_fifo.head + 1) % FIFO_SIZE;
                    packet_fifo.count++;
                } else {
                    printf("⚠️ FIFO Full! Dropping remaining packets.\n");
                    break;
                }
            }

            buffer_ready = (packet_fifo.count >= CHUNK_SIZE); // Notify Core 1
            mutex_exit(&packet_fifo.fifo_mutex);

            local_index = 0;  // Reset local buffer
        }

        sx1278_write_register(0x12, 0x40); // Clear RX done flag

        // ✅ Only send ACK when packets are in sequence
        if ((packet_count % ACK_EVERY_N_PACKETS == 0 && packet_id == expected_packet_id - 1) 
            || last_packet_received) {
            lora_send_ack();
            printf("✅ ACK Sent for Packet %d\n", packet_id);
        }
    }
}







void lora_send_ack() {
    // Switch to Standby mode before TX
    sx1278_write_register(0x01, 0x81); 

    sx1278_write_register(0x0D, 0x00); // Set FIFO pointer
    sx1278_write_register(0x00, 'A');
    sx1278_write_register(0x00, 'C');
    sx1278_write_register(0x00, 'K');
    sx1278_write_register(0x22, 3); // Set payload length
    sx1278_write_register(0x01, 0x83); // Switch to TX mode

    // Wait for TX Done flag before switching back to RX
    while ((sx1278_read_register(0x12) & 0x08) == 0); // Wait for TX Done (Bit 3 of RegIrqFlags)
    sx1278_write_register(0x12, 0x08); // Clear TX Done flag

    printf("ACK Sent\n");

    // Switch back to RX mode after sending ACK
    sx1278_write_register(0x01, 0x85); // Set to RX Continuous Mode
}

void core1_write_flash() {
    uint8_t local_buffer[CHUNK_SIZE][PACKET_SIZE];  // Store only one chunk at a time

    while (1) {
        if (buffer_ready) {
            mutex_enter_blocking(&buffer_mutex);
        
            // ✅ Corrected Pointer-Based Swap
            uint8_t (*temp)[PACKET_SIZE] = back_buffer_ptr;
            back_buffer_ptr = front_buffer_ptr;
            front_buffer_ptr = temp;
        
            buffer_ready = false;  
            mutex_exit(&buffer_mutex);
        
            // ✅ Now write the swapped buffer to Flash
            for (int i = 0; i < CHUNK_SIZE; i++) {
                //write_to_flash(back_buffer_ptr[i]);
            }
        
            printf("Flash write complete\n");
        }
        
    }
}

void core1_process_fifo() {
    static uint8_t local_buffer[CHUNK_SIZE][PACKET_SIZE];  // Temporary storage
    int local_count = 0;  // Track number of packets in local buffer

    while (1) {
        if (buffer_ready || last_packet_received) {  
            mutex_enter_blocking(&packet_fifo.fifo_mutex);

            while (packet_fifo.count > 0 && local_count < CHUNK_SIZE) {
                int index = packet_fifo.tail;
                memcpy(local_buffer[local_count], packet_fifo.buffer[index], PACKET_SIZE);

                packet_fifo.tail = (packet_fifo.tail + 1) % FIFO_SIZE;
                packet_fifo.count--;
                local_count++;
            }

            buffer_ready = false; // Reset flag if chunk was processed
            mutex_exit(&packet_fifo.fifo_mutex);

            // ✅ Print the received chunk correctly
            printf("✅ Chunk Received in Core 1:\n");
            for (int i = 0; i < local_count; i++) {
                printf("📦 Core1 Packet %d (ID=%d): ", i, (local_buffer[i][0] << 8) | local_buffer[i][1]);

            for (int j = 2; j < PACKET_SIZE; j++) {  // Skip packet ID bytes
                if (local_buffer[i][j] == '\0') break;  // Stop if NULL found
                printf("%c", local_buffer[i][j]);
                }
                printf("\n");
            }
            printf("🔚 End of Chunk\n\n");

            // ✅ Simulate writing to SPI Flash
            printf("✍️ Writing %d packets to SPI Flash...\n", local_count);
            sleep_ms(50);  // Simulate flash write delay

            // ✅ Reset buffer to mimic flash erase behavior
            for (int i = 0; i < CHUNK_SIZE; i++) {
                memset(local_buffer[i], 0xFF, PACKET_SIZE);
            }

            printf("🗑️ Local buffer reset to 0xFF after writing to Flash.\n\n");

            local_count = 0; // Reset local buffer count

            // ✅ Send ACK when last packet is written
            if (last_packet_received) {
                lora_send_ack();
                printf("✅ Final ACK Sent. Transmission Complete.\n");
                last_packet_received = false; // Reset flag for next transmission
            }
        } else {
            sleep_us(50);  // Prevent busy-waiting
        }
    }
}




void core1_write_flash_test() {
    uint8_t local_buffer[CHUNK_SIZE][PACKET_SIZE];  // Store only one chunk at a time

    while (1) {
        if (buffer_ready) {
            mutex_enter_blocking(&buffer_mutex);

            // ✅ Double-check buffer_ready to prevent race conditions
            if (!buffer_ready) {
                mutex_exit(&buffer_mutex);
                continue;  // Skip this loop iteration
            }

            // ✅ Copy chunk **AFTER** the buffer swap
            memcpy(local_buffer, back_buffer_ptr, CHUNK_SIZE * PACKET_SIZE);
            buffer_ready = false;  

            mutex_exit(&buffer_mutex);  // ✅ Release mutex early
        
            // ✅ Print the received chunk correctly
            printf("✅ Chunk Received:\n");
            for (int i = 0; i < CHUNK_SIZE; i++) {
                printf("📦 Core1 Packet %d: %s\n", i, local_buffer[i] + 2);  // Skip packet ID bytes
            }
        
            printf("🔚 End of Chunk\n\n");
        }
    }
}



int main() {
    stdio_init_all();
    printf("🚀 LoRa Receiver with FIFO Queue & Core 1 Flash Writing\n");

    // Initialize SPI for LoRa
    spi_init_pico();
    lora_init();
    setup_lora_interrupt();

    // Initialize FIFO queue
    fifo_init(&packet_fifo);

    // Initialize mutex for FIFO protection
    mutex_init(&packet_fifo.fifo_mutex);

    printf("✅ System Initialized, Waiting for Packets...\n");

    // Launch Core 1 to process the FIFO queue and write to SPI Flash
    multicore_launch_core1(core1_process_fifo);

    // Main loop (Core 0) - Receive packets
    while (1) {
        sleep_ms(100); // Let Core 1 process packets
    }

    return 0;
}
