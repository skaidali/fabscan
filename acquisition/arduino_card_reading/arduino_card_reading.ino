#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 10
#define RST_PIN 9
#define LED_PIN 8

MFRC522 mfrc522(SS_PIN, RST_PIN);
String lastRead = "";

void setup() {
  Serial.begin(9600);
  SPI.begin();
  mfrc522.PCD_Init();
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) return;

  String read = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) read += "0";
    read += String(mfrc522.uid.uidByte[i], HEX);
  }

  Serial.println(read);
  lastRead = read;
  digitalWrite(LED_PIN,HIGH);
  delay(750);
  digitalWrite(LED_PIN,LOW);

  mfrc522.PICC_HaltA();
}