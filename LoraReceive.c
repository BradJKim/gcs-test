#include <stdio.h>
#include <string.h>
#include "pico/stdlib.h"
#include "hardware/spi.h"

// Pin definitions
#define SPI_PORT_LoRa spi1
#define PIN_SCK_LoRa 10
#define PIN_MISO_LoRa 12
#define PIN_MOSI_LoRa 11
#define PIN_NSS_LoRa 13
#define PIN_RST_LoRa 15
#define PIN_DIO0_LoRa 14

// Function Prototypes
void spi_init_pico();
void sx1278_reset();
void sx1278_write_register(uint8_t reg, uint8_t value);
uint8_t sx1278_read_register(uint8_t reg);
void lora_init();
void lora_receive();

void spi_init_pico() {
    spi_init(SPI_PORT_LoRa, 500 * 1000);
    gpio_set_function(PIN_SCK_LoRa, GPIO_FUNC_SPI);
    gpio_set_function(PIN_MOSI_LoRa, GPIO_FUNC_SPI);
    gpio_set_function(PIN_MISO_LoRa, GPIO_FUNC_SPI);

    gpio_init(PIN_NSS_LoRa);
    gpio_set_dir(PIN_NSS_LoRa, GPIO_OUT);
    gpio_put(PIN_NSS_LoRa, 1);

    gpio_init(PIN_RST_LoRa);
    gpio_set_dir(PIN_RST_LoRa, GPIO_OUT);
    gpio_put(PIN_RST_LoRa, 1);
}

void sx1278_reset() {
    gpio_put(PIN_RST_LoRa, 0);
    sleep_ms(10);
    gpio_put(PIN_RST_LoRa, 1);
    sleep_ms(10);
}

void sx1278_write_register(uint8_t reg, uint8_t value) {
    uint8_t data[2] = {reg | 0x80, value};
    gpio_put(PIN_NSS_LoRa, 0);
    spi_write_blocking(SPI_PORT_LoRa, data, 2);
    gpio_put(PIN_NSS_LoRa, 1);
}

uint8_t sx1278_read_register(uint8_t reg) {
    uint8_t value;
    gpio_put(PIN_NSS_LoRa, 0);
    spi_write_blocking(SPI_PORT_LoRa, &reg, 1);
    spi_read_blocking(SPI_PORT_LoRa, 0, &value, 1);
    gpio_put(PIN_NSS_LoRa, 1);
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

void lora_receive() {
    if (sx1278_read_register(0x12) & 0x40) {
        sx1278_write_register(0x12, 0x40); // Clear RX done flag
        uint8_t len = sx1278_read_register(0x13); // Get packet length
        sx1278_write_register(0x0D, sx1278_read_register(0x10)); // Set FIFO pointer

        char message[64] = {0};
        for (int i = 0; i < len; i++) {
            message[i] = sx1278_read_register(0x00);
        }
        printf("Received: %s\n", message);
    }
}

int main() {
    stdio_init_all();
    spi_init_pico();
    lora_init();

    printf("LoRa receiver ready...\n");

    while (1) {
        lora_receive();
        sleep_ms(1);
    }

    return 0;
}
