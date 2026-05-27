
python -m pip install -r ./server/requirements.txt
start /B python ./server/serveur.py
start /B python ./acquisition/data_treatment.py
start iexplore.exe "http://localhost:8000"