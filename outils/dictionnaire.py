"""Le dictionnaire des jeux de mots (le mot le plus long, Lettris, Sutom) : dictionnaire.txt, une forme
par ligne, tirée du lexique libre de Grammalecte (https://grammalecte.net, licence MPL 2.0).

L'Officiel du Scrabble n'est pas libre. Le lexique de Grammalecte a toutes les formes fléchies,
réforme de 1990 comprise, et étiquette chacune ; on n'en garde que les mots qu'un joueur de Scrabble
accepterait : ni nom propre, ni sigle, ni abréviation, ni symbole d'unité, ni morceau de locution
latine.

Pour passer à une nouvelle version du lexique, changer VERSION puis :
    python3 outils/dictionnaire.py
Puis relire les nouveaux mots grossiers : SWEAR_WORD, dans le mot le plus long, ne connaît que ceux
de cette version (le lexique n'a pas d'étiquette « vulgaire » ; ses notes « péj » et « arg » aident).
"""

import io
import re
import unicodedata
import urllib.request
import zipfile
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
VERSION = "7.7"
URL = f"https://grammalecte.net/dic/lexique-grammalecte-fr-v{VERSION}.zip"

# Étiquettes (première de la colonne) qui ne sont pas des mots du dictionnaire : noms propres,
# prénoms, patronymes, titres (Mme), chiffres romains, préfixes, suffixes, signes, ponctuation.
PAS_DES_MOTS = {"npr", "prn", "patr", "titr", "nbro", "err", "div", "sign", "pfx", "sfx", "ponc"}


def normalise(mot):
    """Comme normalize() dans les jeux : sans accents, en majuscules, Œ et Æ dédoublés."""
    mot = unicodedata.normalize("NFD", mot)
    mot = "".join(c for c in mot if not unicodedata.combining(c)).upper()
    return mot.replace("Œ", "OE").replace("Æ", "AE")


def garder(colonnes):
    forme, etiquettes, notes, sous_dico = colonnes[2], colonnes[4].split(), colonnes[7].split(), colonnes[10]
    return (
        not forme[:1].isupper()
        and etiquettes[0] not in PAS_DES_MOTS
        and not etiquettes[0].startswith("loc.")  # « priori », « statu » : des bouts de locution
        and "symb" not in notes  # km, kg, min
        and "sig" not in notes
        and "abty" not in notes  # fevr, tel, suppl
        and "X" not in sous_dico  # graphies que Grammalecte écarte : dessication, peuton
        and re.fullmatch("[A-Z]{2,}", normalise(forme))
    )


def main():
    with urllib.request.urlopen(URL) as reponse:
        archive = zipfile.ZipFile(io.BytesIO(reponse.read()))
    lexique = archive.read(f"lexique-grammalecte-fr-v{VERSION}.txt").decode("utf-8")
    formes = set()
    for ligne in lexique.splitlines():
        colonnes = ligne.split("\t")
        if len(colonnes) > 10 and colonnes[0].isdigit() and garder(colonnes):
            formes.add(colonnes[2])
    entete = [
        f"# Mots du français, tirés du lexique de Grammalecte v{VERSION} ({URL}).",
        "# Licence : Mozilla Public License 2.0, http://mozilla.org/MPL/2.0/",
        "# Fabriqué par outils/dictionnaire.py : ne pas modifier à la main.",
    ]
    (RACINE / "dictionnaire.txt").write_text("\n".join(entete + sorted(formes)) + "\n", encoding="utf-8")
    print(f"dictionnaire.txt : {len(formes)} formes, {len({normalise(f) for f in formes})} mots sans accents")


if __name__ == "__main__":
    main()
