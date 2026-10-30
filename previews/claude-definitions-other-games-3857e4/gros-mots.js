// Les gros mots du dictionnaire, sans accents et en majuscules :
// SWEAR_WORD.test("ENCULE"). Ils restent jouables : le joueur peut taper
// n'importe quel mot qui existe. Mais un jeu qui montre de lui-même un mot
// tiré du dictionnaire les écarte (le mot le plus long a montré ENCULE en
// fin de manche, octobre 2026), et explications.js ne les explique pas.
//
// Chaque motif prend un mot entier, sans accents, avec toutes ses formes,
// et épargne ses voisins innocents : SALOPETTE, PISSENLIT, BRANLANT (une
// dent), BRANLEBAS, BORDELAIS, DECONNECTER, TAPINOIS, TRINGLE, TRINGLOT,
// FOUTOU (un plat), PINASSE, BAISER (le nom). Les gros mots du dictionnaire
// ont été relus un à un, ainsi que ses mots marqués péjoratifs ou
// argotiques. Les mots d'enfants (CACA, ZIZI) et le vocabulaire neutre
// (SEXE, CHATTE, PEDALE, BATARD) restent.
window.SWEAR_WORD = (function () {
  // Les formes d'un verbe en -er, hors infinitif, et ses noms en -eur.
  const ER_FORMS =
    "A|AI|AIENT|AIS|AIT|AMES|AS|ASSE|ASSENT|ASSES|ASSIEZ|ASSIONS|AT|ATES" +
    "|E|EE|EES|ENT|ERA|ERAI|ERAIENT|ERAIS|ERAIT|ERAS|ERENT|EREZ|ERIEZ|ERIONS" +
    "|ERONS|ERONT|ES|EUR|EURS|EUSE|EUSES|EZ|IEZ|IONS|ONS"
  return new RegExp(
    "^(?:" +
      [
        // Grossièretés
        "ENCUL.*",
        "CONS?|CONNES?|CONN?ARD(E|ES|S)?|CONN?ASSES?|CONNERIES?|CONNEAUX?|CONNEMENT",
        "DECONN(?!ECT|EX).*",
        "CULS?",
        "COUILL.*",
        "BITES?|BITT.*",
        "PUTES?|PUTAINS?|PUTASS.*",
        "SALOP(?!ETTE).*|SALAUD(E|ES|S)?|SALIGAUD.*",
        "(EM|DE)?MERD.*",
        `(CON)?CHI(${ER_FORMS}|ANTE?S?|ER|ERIES?|URES?)|CHIOTTES?|CHIARDS?|CHIATIQUES?`,
        "NIQU.*",
        "FOUT(?!OUS?$).*",
        "BORDELS?|BORDELIQUES?|BORDELIS.*|BOXON.*",
        "ENFOIRE.*",
        "PISS(?!ENLIT).*",
        "DEGUEUL.*|DEGUEUS?",
        "INFOUT.*|COMPISS.*|IMBITABLES?|PUTACLICS?|QUEUTARDS?|CHTOUILLES?|CAGU.*",
        `BIT(${ER_FORMS}|ER)`,
        "FIONS?",
        "GARCES?|CATINS?|PETASSES?|POU?FFIASSES?|GROGNASSES?",
        // Vocabulaire sexuel cru (BAISER, le nom, reste)
        `BAIS(${ER_FORMS}|ANT)|BAISABLES?|BAISOT.*`,
        "BRANL(?!ANT|EMENT|EBAS).*",
        "CHIBRE|ZOB|NICHONS?|NIBARDS?|ROTOPLOTS|GODES?|GODEMICHES?|PARTOU[SZ].*",
        "BIROUTES?|BURNES?|ROUPETTES?|FOUFOUNES?",
        `PIN(?!ASSES?$)(${ER_FORMS}|ER)`, // la pinasse est un bateau
        "TRINGL(?!ES?$|OTS?$).*|TAPIN(?!OIS).*",
        "PORNO.*|SODOM.*|MASTURB.*|FELLATIONS?|CUNNILINGUS|ORGASMES?|EJACUL.*",
        "COIT(?!ES?$).*", // coite : « rester coi »
        "ANULINGUS|BANDAISONS?|CYPRINES?|CLITOS?|CHAUDASSES?|COUCHERIES?|DOIGTAGES?|NYMPHOS?",
        "DECALOTT.*|DEPUCEL.*|DEVIRGIN.*|ENCLOQU.*|ENGROSS.*|ENTUB.*|ENVIAND.*|FORNIQU.*",
        "GOUGNOT.*|PIGNOL.*|HARDEU(R|RS|SE|SES)|MICHETONS?|RADEUSES?|ROULURES?|ROUSTONS",
        "PALUCH(?!ES?$).*", // la paluche, c'est la main
        "PEDOPHIL.*|ZOOPHIL.*|NECROPHIL.*|INCEST.*|VIOLEUR.*|VIOLEUSES?",
        // Injures racistes ou homophobes
        "PEDES?|PEDERA.*|GOUINES?|GOUINASSES?|GOUDOUS?|FIOTTES?|TAFIOLES?",
        "TANTOU[SZ]ES?|TARLOU[SZ]ES?|TRAVELOS?|GOGOLS?|SIDAIQUES?",
        "NEGRES?|NEGRESS.*|NEGRILL.*|NEGRO.*|YOUPIN.*|BOUGNOUL.*|BICOTS?|CHINETOQUES?|BAMBOULAS?",
        "BOCHES?|RITALS?|POLACKS?|CHLEUHS?|SCHLEUS?|FRIDOLINS?|FRITZ|AMERLOQUES?|ANGLICHES?",
        "BEURETTES?|CROUILL.*|DYKES?|EMPAFFES?|FEMINAZIS?|GITONS?|LOPETTES?|METEQUES?",
        "MORICAUDS?|MOU(K|QU)ERES?|ROMANOS?|NEGRERIES?|NEGRIF.*|BLEDARDS?",
      ].join("|") +
      ")$",
  )
})()
