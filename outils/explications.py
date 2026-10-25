"""Les explications du mot le plus long : en fin de manche, sous chaque mot montré, ce qu'il est (« le
verbe creuser, au présent, avec « ils » ou « elles » ») et, pour un mot peu courant, sa définition.

La grammaire vient des étiquettes du lexique de Grammalecte (outils/dictionnaire.py), les définitions
de outils/definitions.json (outils/definitions.py). Un fichier par première lettre, que le jeu charge
à la fin de la manche, explications/<lettre>.json :
    {"mots": {"CREUSENT": ["creusent", "le verbe creuser, au présent, …", "creuser"], …},
     "definitions": {"creuser": "…", …}}
Le troisième champ, quand il y est, est le mot dont la définition suit.
    python3 outils/explications.py
"""

import json
from collections import defaultdict
from itertools import islice

from dictionnaire import RACINE, lexique, normalise

# Au-delà de 10^6,5 occurrences dans les corpus de Grammalecte (creuser, médiocre), un enfant connaît
# le mot : pas de définition. En dessous (avoine, babiole, scansion), on la donne.
COURANT = 10**6.5
DEFINITIONS = RACINE / "outils" / "definitions.json"
LICENCE = (
    "Grammaire : lexique de Grammalecte, MPL 2.0. Définitions : d'après le Wiktionnaire "
    "(extraction kaikki.org), CC BY-SA 4.0, réécrites pour les enfants."
)

TEMPS = {
    "ipre": "au présent",
    "iimp": "à l'imparfait",
    "ifut": "au futur",
    "ipsi": "au passé simple",
    "cond": "au conditionnel",
    "spre": "au subjonctif présent",
    "simp": "au subjonctif imparfait",
    "impe": "à l'impératif",
}
PRONOMS = {
    "1sg": ["je"],
    "2sg": ["tu"],
    "3sg": ["il", "elle"],
    "1pl": ["nous"],
    "2pl": ["vous"],
    "3pl": ["ils", "elles"],
}
MOTS_DE_GRAMMAIRE = {
    "prep": "une préposition",
    "det": "un déterminant",
    "detpos": "un déterminant",
    "detdem": "un déterminant",
    "detind": "un déterminant",
    "cjco": "une conjonction",
    "cjsub": "une conjonction",
    "adv": "un adverbe",
}


def ou(mots):
    mots = [f"« {m} »" for m in mots]
    return mots[0] if len(mots) == 1 else ", ".join(mots[:-1]) + " ou " + mots[-1]


def accord(etiquettes, base_feminine):
    """« au féminin pluriel » et compagnie, pour une forme qui n'est pas celle du dictionnaire."""
    feminin = "fem" in etiquettes and not base_feminine
    pluriel = "pl" in etiquettes
    return " ".join(m for m, oui in (("féminin", feminin), ("pluriel", pluriel)) if oui)


def infinitif(lemme, drapeaux):
    """« se méfier », « s'enfuir » : Grammalecte marque d'un p (7e signe) les verbes toujours pronominaux."""
    if drapeaux[6:7] != "p":
        return lemme
    return ("s'" if lemme[0] in "aâeéèêiîoôuh" else "se ") + lemme


def phrase(forme, lemme, etiquettes, feminins):
    """Ce qu'est la forme, pour un enfant ; None si les étiquettes ne disent rien d'utile."""
    nature = etiquettes[0]
    if nature.startswith("v"):
        lemme = infinitif(lemme, nature)
        if "infi" in etiquettes:
            return "un verbe"
        if "ppre" in etiquettes:
            return f"le participe présent du verbe {lemme}"
        if "ppas" in etiquettes:
            genre = accord(etiquettes, False)
            return f"le participe passé du verbe {lemme}" + (f", au {genre}" if genre else "")
        temps = next((TEMPS[t] for t in TEMPS if t in etiquettes), None)
        pronoms = [p for cle, ps in PRONOMS.items() if cle in etiquettes or cle + "!" in etiquettes for p in ps]
        if not temps or not pronoms:
            return None  # « perchè-je », « donné-je » : formes inversées, rares
        return f"le verbe {lemme}, {temps}, avec {ou(pronoms)}"
    if nature in ("nom", "adj"):
        if forme != lemme and (genre := accord(etiquettes, lemme in feminins)):
            return f"le {genre} de « {lemme} »"
        if "adj" in etiquettes:
            return "un adjectif"
        if "mas" in etiquettes:
            return "un nom masculin"
        if "fem" in etiquettes:
            return "un nom féminin"
        return "un nom"
    if nature == "mg":
        for e in etiquettes:
            if e in MOTS_DE_GRAMMAIRE:
                return MOTS_DE_GRAMMAIRE[e]
        return "un pronom" if any(e.startswith("pro") for e in etiquettes) else None
    return {"adv": "un adverbe", "interj": "une interjection", "nb": "un nombre"}.get(nature)


def nature_lisible(etiquettes):
    """La nature d'un lemme, pour qui écrira sa définition."""
    if etiquettes[0].startswith("v"):
        return "verbe"
    if "adj" in etiquettes:
        return "adjectif"
    return {"nom": "nom", "adv": "adverbe", "interj": "interjection"}.get(etiquettes[0], "mot")


def rang(etiquettes):
    """Parmi les analyses d'un même lemme, la plus parlante d'abord : le présent avant le subjonctif."""
    return min((i for i, t in enumerate(TEMPS) if t in etiquettes), default=len(TEMPS))


def distinctes(forme, analyses, feminins):
    """Les analyses qui disent quelque chose de nouveau. Un même lemme peut revenir sous une autre nature
    (« ferme », adjectif et nom), pas sous un autre temps (« creuse », présent et impératif)."""
    textes, natures = set(), set()
    for e in analyses:
        texte, nature = phrase(forme, e.lemme, e.etiquettes, feminins), (e.lemme, e.etiquettes[0][:2])
        if texte and texte not in textes and nature not in natures:
            textes.add(texte)
            natures.add(nature)
            yield texte, e


def analyser():
    """{MOT: (forme, phrase, lemme à définir ou None)} et {lemme à définir: sa nature}."""
    entrees = list(lexique())
    # Grammalecte répartit les occurrences d'une forme entre ses analyses : « portes » compte 2,8 millions
    # comme pluriel de porte, 1,5 million comme verbe porter. Une analyse répétée (présent, impératif)
    # porte le même nombre : on ne le compte qu'une fois par lemme.
    par_lemme, par_forme = defaultdict(int), defaultdict(int)
    for (forme, lemme), n in {(e.forme, e.lemme): e.occurrences for e in entrees}.items():
        par_lemme[lemme] += n
        par_forme[forme] += n
    # Les noms et adjectifs féminins par nature (« auge ») : leur pluriel n'est pas « le féminin de ».
    bases = [e for e in entrees if e.forme == e.lemme]
    feminins = {e.lemme for e in bases if "fem" in e.etiquettes and "sg" in e.etiquettes}
    feminins -= {e.lemme for e in bases if "mas" in e.etiquettes}

    # De 3 à 9 lettres : MIN_LENGTH et TILE_COUNT du mot le plus long.
    par_mot = defaultdict(list)
    for e in entrees:
        if 3 <= len(mot := normalise(e.forme)) <= 9:
            par_mot[mot].append(e)

    mots, a_definir = {}, {}
    for mot, analyses in par_mot.items():
        # La forme la plus courante, PECHE se lit pêche ; à égalité, celle du lemme le plus courant
        # (brûlasses plutôt que brulasses), puis la première du lexique.
        forme = max(analyses, key=lambda e: (par_forme[e.forme], par_lemme[e.lemme])).forme
        analyses = sorted((e for e in analyses if e.forme == forme), key=lambda e: (-e.occurrences, rang(e.etiquettes)))
        retenues = list(islice(distinctes(forme, analyses, feminins), 2))
        # Une seconde analyse seulement si elle n'est pas anecdotique (« portes » : porte, porter).
        if len(retenues) == 2 and retenues[1][1].occurrences < retenues[0][1].occurrences / 5:
            del retenues[1:]
        if not retenues:
            continue
        premiere = retenues[0][1]
        lemme = premiere.lemme if par_lemme[premiere.lemme] < COURANT else None
        if lemme:
            a_definir[lemme] = nature_lisible(premiere.etiquettes)
        mots[mot] = (forme, ", ou ".join(t for t, _ in retenues), lemme)
    return mots, a_definir


def lire_definitions():
    return json.loads(DEFINITIONS.read_text(encoding="utf-8")) if DEFINITIONS.exists() else {}


def main():
    mots, _ = analyser()
    definitions = lire_definitions()
    par_lettre = defaultdict(dict)
    for mot in sorted(mots):
        forme, texte, lemme = mots[mot]
        par_lettre[mot[0]][mot] = [forme, texte] + ([lemme] if definitions.get(lemme) else [])
    dossier = RACINE / "explications"
    dossier.mkdir(exist_ok=True)
    definis = 0
    for lettre, des_mots in par_lettre.items():
        lemmes = {e[2] for e in des_mots.values() if len(e) > 2}
        definis += sum(len(e) > 2 for e in des_mots.values())
        fichier = {"licence": LICENCE, "mots": des_mots, "definitions": {l: definitions[l] for l in sorted(lemmes)}}
        texte = json.dumps(fichier, ensure_ascii=False, separators=(",", ":"))
        (dossier / f"{lettre}.json").write_text(texte, encoding="utf-8")
    print(f"explications/ : {len(mots)} mots, {definis} avec définition")


if __name__ == "__main__":
    main()
