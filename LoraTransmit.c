#include <stdio.h>
#include <string.h>
#include "pico/stdlib.h"
#include "hardware/spi.h"

// Pin definitions
#define SPI_PORT spi1
#define PIN_SCK 10
#define PIN_MISO 12
#define PIN_MOSI 11
#define PIN_NSS 13
#define PIN_RST 15
#define PIN_DIO0 14

// Function Prototypes
void spi_init_pico();
void sx1278_reset();
void sx1278_write_register(uint8_t reg, uint8_t value);
uint8_t sx1278_read_register(uint8_t reg);
void lora_init();
void lora_send_char(char c);

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
}

void lora_send_char(char c) {
    sx1278_write_register(0x0D, 0x00); // Set FIFO pointer
    sx1278_write_register(0x00, c);    // Write character to FIFO
    sx1278_write_register(0x22, 1);    // Set payload length (1 byte)
    sx1278_write_register(0x01, 0x83); // Set to TX mode

    while ((sx1278_read_register(0x12) & 0x08) == 0); // Wait for TX done
    sx1278_write_register(0x12, 0x08); // Clear TX done flag
}

int main() {
    stdio_init_all();
    spi_init_pico();
    lora_init();

    printf("LoRa real-time sender ready. Hold a key to send repeatedly.\n");

    while (1) {
        int ch = getchar_timeout_us(0); // Get a character without blocking

        if (ch != PICO_ERROR_TIMEOUT) { // If a character is received
            printf("%c", ch); // Echo locally
            lora_send_char((char)ch); // Send via LoRa
        }

        sleep_ms(100); // Adjust for repeat speed (lower = faster repeats)
    }

    return 0;
}
