import serial
import serial.tools.list_ports
import time
import requests
from datetime import datetime as dt


# ==========================================
# CONFIGURATION
# ==========================================
SERVER_URL = "http://localhost:8000/api/scan"

# ==========================================
# 1. DÉTECTION DU MATÉRIEL
# ==========================================
def find_arduino_port():
    """Scanne les ports USB pour trouver l'Arduino automatiquement."""
    print("Recherche du lecteur RFID...")
    ports = serial.tools.list_ports.comports()
    
    for port in ports:
        if "Arduino" in port.description or "CH340" in port.description or "USB" in port.description:
            print(f"-> Lecteur détecté sur le port : {port.device}")
            return port.device
            
    return None


# ==========================================
# 2. COMMUNICATION WEB
# ==========================================
def send_to_server(card_id):
    """Envoie l'ID de la carte au serveur via une requête HTTP POST."""
    payload = {
        "user_id": card_id,
        "motif": "Entrée via Arduino"
    }
    
    try:
        reponse = requests.post(SERVER_URL, json=payload, timeout=2)
        
        if reponse.status_code == 200:
            resultat = reponse.json()
            if resultat.get("success"):
                print(f" OK : {resultat.get('message', 'Opération réussie')}")
            else:
                print(f" Info : {resultat.get('error', 'Non reconnu')}")
        else:
            print(f" Erreur serveur : Code {reponse.status_code}")
            
    except requests.exceptions.RequestException:
        print(" Impossible de joindre le serveur. Vérifiez que le serveur est en cours d'exécution.")


# ==========================================
# 3. LECTURE DES BADGES
# ==========================================
def clear_data(byteString):
    """Nettoie les données brutes reçues par le port série."""
    text = byteString.decode(errors="ignore").strip()
    return text

def data_acquisition():
    """Boucle principale d'acquisition des données."""
    port_detecte = find_arduino_port()
    
    if not port_detecte:
        print("Erreur : Aucun lecteur RFID/Arduino branché ou reconnu.")
        return 

    try:
        ser = serial.Serial(port_detecte, baudrate=9600, timeout=1)
        time.sleep(2) # Laisse le temps à la connexion de s'établir
        ser.reset_input_buffer()
        print("\n--- LECTEUR PRÊT ! En attente d'un badge... ---\n")

        while True:
            ligne_brute = ser.readline()
            ID = clear_data(ligne_brute)
            if ID:
                print("--------------------------")
                print(f"Badge scanné : {ID}")
                send_to_server(ID)
            
    except serial.SerialException as e:
        print(f"Erreur de port série : {e}")
        print("Vérifiez que le Moniteur Série Arduino est bien fermé.")

# Lancement du script
if __name__ == "__main__":
    data_acquisition()