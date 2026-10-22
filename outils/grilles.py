"""Les grilles de mots mêlés : huit mots d'un même son (CP, CE1), posés de gauche à droite ou de haut
en bas dans une grille de 12 × 6, les cases libres comblées avec des lettres de ces mêmes mots.

Chaque mot se trouve une seule fois, dans un sens comme dans l'autre, et aucun gros mot ne s'y lit
par hasard. Le tirage dépend des mots seuls : relancer le script redonne les mêmes grilles.

Le script les écrit dans word-search-game.html, entre les repères « grilles générées » qui suivent
les quatre grilles faites à la main. Un nouveau son s'ajoute à la fin de SONS, jamais au milieu :
l'étoile d'une grille finie est rangée sous son numéro. Puis les voix : outils/voix.py.
    python3 outils/grilles.py
"""

import json
import random
import re
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
COLONNES, LIGNES = 12, 6

SONS = [
    (["ch"], ["chat", "cheval", "chaise", "chemise", "vache", "chocolat", "mouche", "cloche"]),
    (["ou"], ["poule", "mouton", "soupe", "bouche", "genou", "hibou", "citrouille", "kangourou"]),
    (["on", "om"], ["ballon", "maison", "cochon", "crayon", "savon", "pompier", "ombre", "concombre"]),
    (["oi"], ["roi", "poire", "étoile", "voiture", "oiseau", "poisson", "armoire", "mouchoir"]),
    (["au", "eau"], ["jaune", "sauter", "autruche", "gauche", "bateau", "château", "chapeau", "cadeau"]),
    (["é", "er", "ez"], ["bébé", "école", "vélo", "fusée", "épée", "panier", "rocher", "nez"]),
    (["è", "ê", "ai", "ei"], ["frère", "flèche", "fête", "forêt", "fraise", "lait", "neige", "baleine"]),
    (["eu"], ["feu", "bleu", "jeudi", "cheveu", "fleur", "beurre", "docteur", "moteur"]),
    (["in", "im"], ["lapin", "sapin", "jardin", "matin", "dauphin", "moulin", "timbre", "simple"]),
    (["s", "ss"], ["rose", "vase", "cousin", "bisou", "tasse", "dessin", "coussin", "poussin"]),
    (["ill", "eil", "ouil", "euil"], ["fille", "bille", "papillon", "soleil", "abeille", "oreille", "grenouille", "feuille"]),
    (["gn"], ["cygne", "ligne", "peigne", "vigne", "agneau", "gagner", "araignée", "champignon"]),
    (["f", "ff", "ph"], ["phare", "photo", "phoque", "éléphant", "alphabet", "téléphone", "girafe", "coffre"]),
]

GROS_MOTS = ["CON", "CUL", "PUTE", "MERDE", "BITE", "CACA", "PIPI", "ZIZI", "NAZI", "SEXE", "CHIER", "NIQUE"]

# Les huit sens où le doigt peut tracer (DIRECTIONS dans la page) ; on ne pose qu'à l'endroit.
SENS = [(0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1), (-1, 0), (-1, 1)]
LIGNE, COLONNE = (0, 1), (1, 0)


def chemins(g, mot):
    """Les cases de chaque endroit où se lit le mot, dans les huit sens."""
    trouves = []
    for l in range(LIGNES):
        for c in range(COLONNES):
            if g[l][c] != mot[0]:
                continue
            for dl, dc in SENS:
                cases = [(l + dl * k, c + dc * k) for k in range(len(mot))]
                if all(0 <= x < LIGNES and 0 <= y < COLONNES and g[x][y] == m for (x, y), m in zip(cases, mot)):
                    trouves.append(cases)
    return trouves


def emplacements(g, mot, dl, dc):
    return [(l, c)
            for l in range(LIGNES - dl * (len(mot) - 1))
            for c in range(COLONNES - dc * (len(mot) - 1))
            if all(g[l + dl * k][c + dc * k] in (None, m) for k, m in enumerate(mot))]


def poser(mots, hasard):
    """Une tentative : les mots du plus long au plus court, puis les cases libres. None si ça coince,
    ou s'il y a moins de deux mots en colonne (comme dans les premières grilles)."""
    g = [[None] * COLONNES for _ in range(LIGNES)]
    en_colonne = 0
    for mot in sorted(mots, key=len, reverse=True):
        # Un mot sur trois en colonne quand il y tient.
        for dl, dc in [COLONNE, LIGNE] if hasard.random() < 0.35 else [LIGNE, COLONNE]:
            places = emplacements(g, mot, dl, dc)
            if places:
                break
        else:
            return None
        l, c = hasard.choice(places)
        for k, m in enumerate(mot):
            g[l + dl * k][c + dc * k] = m
        en_colonne += (dl, dc) == COLONNE
    if en_colonne < 2:
        return None
    lettres = "".join(mots)
    return [[case or hasard.choice(lettres) for case in ligne] for ligne in g]


def gros_mot_fortuit(g, poses):
    """Un gros mot lu ailleurs que tout entier dans un vrai mot (CON dans CONCOMBRE ne compte pas)."""
    for gros in GROS_MOTS:
        for cases in chemins(g, gros):
            if not any(set(cases) <= p for p in poses):
                return True
    return False


def grille(mots):
    hasard = random.Random(" ".join(mots))
    mots = [m.upper() for m in mots]
    for _ in range(5000):
        g = poser(mots, hasard)
        if g is None:
            continue
        trouves = [chemins(g, m) for m in mots]
        if any(len(t) != 1 for t in trouves) or gros_mot_fortuit(g, [set(t[0]) for t in trouves]):
            continue
        return " ".join("".join(ligne) for ligne in g)
    raise RuntimeError(f"Pas de grille pour {mots}")


def entree(sons, mots):
    lignes = ["{", f'  grid: "{grille(mots)}",', f"  sounds: {json.dumps(sons, ensure_ascii=False)},", "  words: ["]
    lignes += [f'    {{ word: "{mot}" }},' for mot in mots]
    lignes += ["  ],", "},"]
    return "".join(f"        {ligne}\n" for ligne in lignes)


def main():
    page = RACINE / "word-search-game.html"
    debut, fin = "        // <grilles générées>\n", "        // </grilles générées>\n"
    texte = page.read_text()
    bloc = "".join(entree(sons, mots) for sons, mots in SONS)
    texte, n = re.subn(re.escape(debut) + ".*?" + re.escape(fin), lambda _: debut + bloc + fin, texte, flags=re.S)
    if n != 1:
        raise SystemExit(f"Repères « grilles générées » introuvables dans {page.name}")
    page.write_text(texte)
    print(f"{len(SONS)} grilles écrites dans {page.name}")


if __name__ == "__main__":
    main()
