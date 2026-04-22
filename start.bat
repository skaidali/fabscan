cd server
python -m pip install -r requirements.txt
python serveur.py
cd ../acquisition
python data_treatment.py
start iexplore.exe "http://localhost:8000"