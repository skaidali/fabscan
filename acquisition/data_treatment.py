import serial
import time

comPort = 3
cycle_delay = 0.5 #en s


def clear_data(byteString):  # nettoie le string et le rend pret à être traité
    """
    L'arduino communique sur le port serie l'ID de la carte RFID scannée. Ce script
    déchiffre les données envoyées et renvoie l'ID de la carte.
    """
    text = byteString.decode(errors="ignore")
    text=text.strip()
    return text


def data_acquisition(com):
    """
    Après une initialisation, ce script interroge l'arduino dans une boucle infinie,
    traite les données avec le scipt clear_data et les envoie via la fonction send_data.
    """
    ser = serial.Serial("COM" + str(com), baudrate=9600, timeout=1)  # connection a l'arduino
    # Initialisation de la connection :
    time.sleep(2)
    ser.reset_input_buffer()

    while True:
        ID = clear_data(ser.readline())
        if not ID:
            continue

        print(ID)


data_acquisition(comPort)