import serial
import serial.tools.list_ports
import time
import requests

SERVER_URL = "http://localhost:8000/api/scan"
CYCLE_DELAY = 0.5 

def find_arduino_port():
    print("Recherche du lecteur RFID...")
    ports = serial.tools.list_ports.comports()
    for port in ports:
        if "Arduino" in port.description or "CH340" in port.description or "USB" in port.description:
            print(f"-> Lecteur détecté sur le port : {port.device}")
            return port.device
    return None

def send_to_server(card_id):
    """Envoie simplement l'ID de la carte au serveur, sans se soucier du contexte (inscription ou scan)."""
    payload = {"user_id": card_id}
    
    try:
        reponse = requests.post(SERVER_URL, json=payload, timeout=0.1)
        if reponse.status_code == 200:
            print(f"Scan transmis à la mémoire du serveur : {card_id}")
        else:
            print(f"Erreur serveur : Code {reponse.status_code}")
    except requests.exceptions.RequestException:
        print("Impossible de joindre le serveur. (Est-il allumé ?)")

def clear_data(byteString):
    return byteString.decode(errors="ignore").strip()

def data_acquisition():
    port_detecte = find_arduino_port()
    if not port_detecte:
        print(" Erreur : Aucun lecteur RFID trouvé.")
        return

    try:
        ser = serial.Serial(port_detecte, baudrate=9600, timeout=0.5)
        time.sleep(2)
        ser.reset_input_buffer()
        print("\n=======================================================")
        print("LECTEUR PRÊT")
        print("=======================================================\n")

        while True:
            ligne_brute = ser.readline()
            ID = clear_data(ligne_brute)
            
            if ID:
                send_to_server(ID)
                
    except serial.SerialException as e:
        print(f"Erreur de communication : {e}")

if __name__ == "__main__":
    data_acquisition()