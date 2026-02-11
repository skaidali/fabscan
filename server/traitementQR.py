from datetime import datetime
import qrcode
from pathlib import Path 



def generateID():
    id = str(datetime.now())
    id = ''.join(c for c in id if c.isdigit())
    return id

def createQR(create_id = True, id = None):  
    

    qr_data = id 
    if create_id : 
        qr_data = generateID()
    assert(not qr_data is None)
    img = qrcode.make(qr_data)

    base_dir = Path(__file__).resolve().parent.parent 
    data_dir = base_dir/"database/QRcode"
    file_path = data_dir / f"{qr_data}.png"

    img.save(file_path)
    return qr_data 

def qr_exists(ID):
    base_dir = Path(__file__).resolve().parent.parent 
    data_dir = base_dir/"database/QRcode"
    file_path = data_dir / f"{ID}.png"
    return file_path.exists()



if __name__ == "__main__" : 
    ID_test = generateID()
    createQR(False,ID_test)
    assert qr_exists(ID_test)






