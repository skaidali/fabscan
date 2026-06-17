# excelError 

Un script dont le but est d'analyser un fichier excel pour déterminer : 
- le pourcentage d'entrées incomplètes 
- les erreurs sur les entrées.

On considère comme erreurs toutes les entrées qui sont similaire à plus d'un certain seuil mais n'étant pas exactement identique (par exemple, `bonjour` et `bonfour`)

On parcourt ainsi toutes les entrées pour incrémenter deux compteurs : un pour les entrées incomplètes et l'autre pour les erreurs.

On obtient 50% d'entrées incomplètes et 47,4% d'entrées erronées. (Attention, il peut y avoir des faux positifs !! Par exemple, si il existe deux personnes `Jean Moreau` et `Jean Moreaux`, cela est detecté comme une erreur) 