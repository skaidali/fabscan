import pandas as pd
from difflib import SequenceMatcher

file_name = "data.xlsx"
to_read = ['JUIN', 'MAI', 'AVRIL', 'MARS', 'FEVRIER', 'JANVIER',
          'DECEMBRE', 'NOVEMBRE', 'OCTOBRE', 'SEPTEMBRE']
cols = ["NOM","Prénom"]

# Lecture des données
data = pd.read_excel(file_name, sheet_name=to_read, usecols=cols)
file = pd.concat(data.values(),ignore_index=True)

name_list = []
fname_list = []
for row in file.itertuples(index=False):
    name = str(row.NOM).strip() if str(row.NOM)!="nan" else ""
    first_name = str(row.Prénom).strip() if str(row.Prénom)!="nan" else ""
    name_list.append(name)
    fname_list.append(first_name)

empty_count = 0
for i in range(len(name_list)):
    if name_list[i]=="" or fname_list[i]=="":
        empty_count += 1


# détection des entrées similaires mais non identiques :
def similarity(a, b):
    return SequenceMatcher(None, a, b).ratio()

threshold = 0.9  # seuil de similarité
n = len(name_list)

similar_count = 0
similar_pairs = []
flagged = set()

for i in range(n):
    for j in range(i + 1, n):
        if j in flagged:
            continue
        if (
            similarity(name_list[i], name_list[j]) >= threshold
            and similarity(fname_list[i], fname_list[j]) >= threshold
            and (name_list[i], fname_list[i]) != (name_list[j], fname_list[j])
        ):
            similar_count += 1
            similar_pairs.append(((name_list[i], fname_list[i]), (name_list[j], fname_list[j])))
            flagged.add(j)

error_count = len(flagged)

print("Entrées vides ou incomplètes : {}".format(empty_count))
print("Proportion d'entrées vide ou incomplètes : {}%".format(round(empty_count/len(name_list)*100,2)))
print("Entrées similaires non identiques : {}".format(error_count))
print("Proportion d'entrées similaires non identiques : {}%".format(round(error_count/(len(name_list)-empty_count)*100,2)))

print("Proportion totale d'entrées fausses : {}%".format(round((error_count+empty_count)/len(name_list)*100,2)))

print(similar_pairs)