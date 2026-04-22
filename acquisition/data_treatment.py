import serial
import serial.tools.list_ports  # NOUVEAU : Pour scanner les ports USB
import time
import requests                 # NOUVEAU : Pour parler à serveur.py

# Adresse de ton serveur (route de l'API prévue dans serveur.py)
SERVER_URL = "http://localhost:8000/api/scan"
CYCLE_DELAY = 0.5 # en secondes

# ---------------------------------------------------------
# 1. DÉTECTION AUTOMATIQUE DU PORT USB
# ---------------------------------------------------------
def find_arduino_port():
    """
    Scanne les ports USB et cherche un appareil ressemblant à un Arduino.
    """
    print("Recherche du lecteur RFID...")
    ports = serial.tools.list_ports.comports()
    
    for port in ports:
        # On affiche ce qu'on trouve pour le debug
        print(f" - Trouvé : {port.device} ({port.description})")
        
        # Les Arduino ont souvent "Arduino", "CH340" ou "USB Serial" dans leur description
        if "Arduino" in port.description or "CH340" in port.description or "USB" in port.description:
            print(f"-> Lecteur détecté sur le port : {port.device}")
            return port.device
            
    # Si on ne trouve rien
    return None

# ---------------------------------------------------------
# 2. ENVOI DES DONNÉES AU SERVEUR (HTTP)
# ---------------------------------------------------------
def send_to_server(card_id):
    """
    Envoie l'ID scanné au serveur web via une requête POST.
    """
    payload = {
        "user_id": card_id,
        "motif": "Entrée via Arduino"
    }
    
    try:
        print(f"Envoi au serveur de l'ID : {card_id}...")
        # Envoi de la requête au serveur (timeout court pour ne pas bloquer le lecteur)
        reponse = requests.post(SERVER_URL, json=payload, timeout=2)
        
        if reponse.status_code == 200:
            resultat = reponse.json()
            if resultat.get("success"):
                print(f"OK : {resultat.get('message', 'Entrée validée')}")
            else:
                print(f"Refusé : {resultat.get('error', 'Erreur inconnue')}")
        else:
            print(f"Erreur serveur : Code {reponse.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"Impossible de joindre le serveur. Est-il allumé sur le port 8000 ?")

# ---------------------------------------------------------
# 3. TRAITEMENT ET ACQUISITION
# ---------------------------------------------------------
def clear_data(byteString):
    """Nettoie le string et le rend prêt à être traité"""
    text = byteString.decode(errors="ignore")
    text = text.strip()
    return text

def data_acquisition():
    """
    Initialise la connexion avec le port détecté et boucle à l'infini pour lire les badges.
    """
    # On cherche le port automatiquement
    port_detecte = find_arduino_port()
    
    if not port_detecte:
        print("Erreur : Aucun lecteur RFID/Arduino trouvé. Vérifiez le branchement USB.")
        return # On arrête le programme

    try:
        # On se connecte au port trouvé (plus besoin de concaténer "COM")
        ser = serial.Serial(port_detecte, baudrate=9600, timeout=1)
        
        print("Initialisation de la connexion...")
        time.sleep(2)
        ser.reset_input_buffer()
        print("\n--- LECTEUR PRÊT ! En attente d'un badge... ---")

        while True:
            ligne_brute = ser.readline()
            ID = clear_data(ligne_brute)
            
            if not ID:
                continue

            print("\n--------------------------")
            print(f"Badge détecté : {ID}")
            
            # Au lieu de juste faire un print, on l'envoie au serveur !
            send_to_server(ID)
            
            # Petite pause pour ne pas lire la même carte 10 fois par seconde
            time.sleep(CYCLE_DELAY)
            
    except serial.SerialException as e:
        print(f"Erreur de communication série : {e}")
        print("Le port est peut-être déjà ouvert dans un autre logiciel (ex: Moniteur Série Arduino).")

# Lancement du programme (plus besoin de passer le port en paramètre !)
if __name__ == "__main__":
    data_acquisition()