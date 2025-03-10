String readString;

void setup() {
    Serial.begin(115200);  // Start USB serial communication at 115200 baud
    while (!Serial);       // Wait for the Serial connection (optional)

    pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
    Serial.println("{type: 'ping'}");  // Send message over USB Serial
    
    digitalWrite(LED_BUILTIN, LOW);  

    while (Serial.available()) {
      delay(3);
      if (Serial.available() >0) {
        char c = Serial.read();
        readString += c; 
      } 

      digitalWrite(LED_BUILTIN, HIGH);  
    }
                   
    digitalWrite(LED_BUILTIN, LOW);   
    delay(1000); 
    readString = "";
    
}
