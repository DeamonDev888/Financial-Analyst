Et juste les jours les + volatile pour que tu comprennes mieux c’est lundi et vendredi .

Pourquoi lundi :

Preparation de la semaine prise en compte des earnings, annonces taux fed… de la semaine qui va avoir donc les intervenant du marche vont tout faire pour s’ajuster a la valeur la plus cohérente a ce qui PEUT SE PASSER par rapport a cette semaine.

Et vendredi ducoup c’est la prevision aussi de ce qui va se passer la semaine pro

Et pour les comptes topstep c’est 50$ par mois pour valider le compte donc tant que ta pas valider le compte ( donc passer de 0$ à 3000$ de benef sur le compte )tu racles tous les mois sauf qu’on est pas des tdc ducoup ca valide le compte en quelques jours et apres tu paye la validation c’est 150$ une fois et tu la definitivement le compte tt ta vie quoi
Et pour les flux pour topstep profondeur de marche dit toit ils font payer ca 50$ ou un truc hyper chere alors que juste avec amp c 13$ /mois donc pour les couts de flux tqt j’ai tout optimise pour payer le moins chere possible
Donc c’est mieux de faire comme jtai dit y a pas mieux en terme de cout de fluw
Flux\*

https://www.earningswhispers.com/

et y a les earnings aussi dedans normalement c’est gratuit a moins qu’il ai change leur formule d’abonnement ou quoi jte laisse verifier

refaire l arboresce du projet et le graphique

etablir les workflow daily hourly weekly
Vous pouvez maintenant tout gérer depuis
run.ts
Analyser seulement : npx ts-node run.ts --analyze
Mettre à jour les données : npx ts-node run.ts --refresh
Tout faire en boucle : npx ts-node run.ts --continuous

des agent et de leur fonction

la database au centre

j ai un base agent qui est la base des agent

jai un sentiment agent qui recupere les donné scrappé sur les sites et fait une analyse sentiment,
Ce qui est mieux c’est analyse daily daily par rapport au jour d’avant / weekly et par rapport a la semaine d’avant.
Parce que la valeur elle change tous les jours pour le marche et elle est surtout prise en compte par rapport a ce qui se passe avant en semaine et en jour juste
Ca enlevera un maximum de bruit et ce qui donnera des meilleurs niveaux
(sauvegarde ces action dans la db)

je veu un agent scraping (algorithmique) qui vas etre en charge de scraper les sites , enregistrer ces resultats dans la db

## je veu un risk agent qui lui vas prendre les donner du vix

pour le risk agent : il vas avoir le vix

je veu un agent qui vas etre en charge de faire les prediction pour le futures

gabarit de resultat des agent avec appel a kilocode-cli
EXAMPLE:
{
"sentiment": "BEARISH",
"score": -25,
"catalysts": ["Bitcoin decline", "Fed hawkish"],
"risk_level": "HIGH",
"summary": "Market sentiment is negative due to..."
}

STRUCTURE:
{
"sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
"score": number between -100 and 100,
"catalysts": ["string", "string"],
"risk_level": "LOW" | "MEDIUM" | "HIGH",
"summary": "Brief explanation"
}
