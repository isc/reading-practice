"""Les définitions pour enfants des mots peu courants du mot le plus long : outils/definitions.json,
{lemme: définition}, que outils/explications.py range ensuite par lettre.

Les sens viennent du Wiktionnaire (extraction de kaikki.org, licence CC BY-SA 4.0) ; Claude les
réécrit pour un enfant de CM1, sans rien inventer, par lots de 40 mots. Il passe par Claude Code en
ligne de commande (claude -p), donc par l'abonnement d'Ivan, pas par une clé d'API payante. Un mot que
Claude juge déplacé pour un enfant (grossier, sexuel, injurieux) reste sans définition : null dans le
fichier. Un mot pour lequel Claude n'a rien rendu vaut "" et sera redemandé au passage suivant, comme
les mots nouveaux ; les autres sont gardés. Le fichier est réécrit après chaque lot : un arrêt en route
ne perd rien.

Sur charras :
    curl -LO https://kaikki.org/frwiktionary/raw-wiktextract-data.jsonl.gz
    python3 outils/definitions.py raw-wiktextract-data.jsonl.gz
L'option --essai N définit N mots au hasard sans rien écrire, pour juger la qualité avant de lancer.
"""

import argparse
import gzip
import json
import os
import random
import subprocess
import tempfile
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

import explications

MODELE = "opus"
PAR_LOT = 40
EN_PARALLELE = 4
POS = {"verbe": "verb", "nom": "noun", "adjectif": "adj", "adverbe": "adv", "interjection": "intj"}

CONSIGNE = """Tu écris les définitions d'un jeu de lettres pour des enfants de 7 à 11 ans. On te donne \
des mots du français, avec leur nature et les sens que leur donne le Wiktionnaire.

Pour chaque mot :
- Écris une seule définition, courte (une quinzaine de mots au plus), avec des mots qu'un enfant de \
CM1 connaît.
- Prends le sens le plus courant, ou le plus parlant pour un enfant, parmi ceux qu'on te donne, \
même s'il est d'une autre nature que celle indiquée. Un sens qui commence par « « X » : » est celui du \
mot X, auquel le Wiktionnaire renvoie : sers-t'en pour définir le mot.
- N'invente aucun sens. Un sens technique se dit simplement, sans le fausser : ne laisse la définition \
vide que si aucun sens ne t'est donné.
- Ne répète pas le mot défini. Commence par une minuscule, sans point final.
- Selon la nature du sens choisi : pour un verbe, commence par un verbe à l'infinitif (« faire un \
trou dans la terre »). Pour un nom, par un article (« un petit objet sans valeur »). Pour un adjectif, \
par « qui » (« qui a deux couleurs »).
- Si le mot, dans tous ses sens, est grossier, sexuel, une insulte, ou ne convient pas à un enfant, \
mets « convient » à false et laisse la définition vide."""

SCHEMA = {
    "type": "object",
    "properties": {
        "mots": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "mot": {"type": "string"},
                    "definition": {"type": "string"},
                    "convient": {"type": "boolean"},
                },
                "required": ["mot", "definition", "convient"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["mots"],
    "additionalProperties": False,
}


def entrees_francaises(chemin):
    with gzip.open(chemin, "rt", encoding="utf-8") as f:
        for ligne in f:
            # Le préfiltre attrape aussi des traductions vers le français d'entrées d'autres langues.
            if '"lang_code": "fr"' in ligne:
                entree = json.loads(ligne)
                if entree.get("lang_code") == "fr":
                    yield entree


def gloses(entree):
    """Les sens d'une entrée qui ont un texte, avec leurs repères (« familier », « chimie »…)."""
    for s in entree.get("senses", []):
        if glose := " ".join(s.get("glosses", [])[-1:]).strip()[:300]:
            reperes = s.get("tags", []) + s.get("raw_tags", []) + s.get("topics", [])
            yield s, glose + (f" [{', '.join(reperes)}]" if reperes else "")


def sens_du_wiktionnaire(chemin, voulues):
    """Pour chaque lemme voulu, ses sens : ceux de sa nature d'abord, six au plus. Un sens qui ne fait que
    renvoyer à un autre mot (« Participe passé du verbe redonder », « Variante de tête-bêche ») est
    remplacé par les sens de ce mot, lus dans un second passage."""
    sens, renvois = defaultdict(list), defaultdict(set)
    for entree in entrees_francaises(chemin):
        mot = entree.get("word")
        if mot not in voulues:
            continue
        autre_nature = entree.get("pos") != POS.get(voulues[mot])
        for s, texte in gloses(entree):
            if vers := [c["word"] for c in s.get("form_of", []) + s.get("alt_of", []) if c.get("word")]:
                renvois[mot].update(vers)
            else:
                sens[mot].append((autre_nature, texte))
    if renvois:
        cibles = set().union(*renvois.values())
        sens_des_cibles = defaultdict(list)
        for entree in entrees_francaises(chemin):
            if (cible := entree.get("word")) in cibles:
                sens_des_cibles[cible] += [f"« {cible} » : {t}" for _, t in gloses(entree)]
        for mot, vers in renvois.items():
            for cible in sorted(vers):
                sens[mot] += [(True, t) for t in sens_des_cibles[cible]]
    return {mot: [t for _, t in sorted(liste, key=lambda x: x[0])][:6] for mot, liste in sens.items() if liste}


def demander(lot, voulues, sens):
    """Les définitions d'un lot : None quand le mot ne convient pas à un enfant, "" quand Claude n'a rien
    rendu ; {} si l'appel a échoué."""
    mots = [{"mot": m, "nature": voulues[m], "sens": sens[m]} for m in lot]
    commande = ["claude", "-p", json.dumps(mots, ensure_ascii=False), "--system-prompt", CONSIGNE]
    commande += ["--json-schema", json.dumps(SCHEMA), "--model", MODELE, "--effort", "low", "--output-format", "json"]
    # Ni outils, ni MCP, ni réglages : sans --setting-sources, le CLAUDE.md global d'Ivan ajoute 14 000
    # tokens à chaque appel. Et sans clé d'API dans l'environnement, claude passe par l'abonnement.
    commande += ["--tools", "", "--strict-mcp-config", "--setting-sources=", "--no-session-persistence"]
    env = {k: v for k, v in os.environ.items() if k not in ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN")}
    try:
        sortie = subprocess.run(
            commande, capture_output=True, text=True, env=env, cwd=tempfile.gettempdir(), timeout=900
        )
        rendus = json.loads(sortie.stdout)["structured_output"]["mots"]
    except (subprocess.TimeoutExpired, json.JSONDecodeError, KeyError, TypeError) as erreur:
        print(f"lot {lot[0]}… : pas de réponse ({erreur})", flush=True)
        return {}
    return {m["mot"]: (m["definition"].strip() if m["convient"] else None) for m in rendus if m["mot"] in lot}


def ecrire(definitions):
    """Réécrit definitions.json d'un coup : un arrêt pendant l'écriture ne le tronque pas."""
    provisoire = explications.DEFINITIONS.with_suffix(".tmp")
    texte = json.dumps(dict(sorted(definitions.items())), ensure_ascii=False, indent=0)
    provisoire.write_text(texte + "\n", encoding="utf-8")
    os.replace(provisoire, explications.DEFINITIONS)


def main():
    arguments = argparse.ArgumentParser()
    arguments.add_argument("wiktionnaire", help="raw-wiktextract-data.jsonl.gz de kaikki.org")
    arguments.add_argument("--essai", type=int, default=0, help="définir N mots au hasard, sans rien écrire")
    options = arguments.parse_args()

    _, voulues = explications.analyser()
    connues = explications.lire_definitions()
    # Les mots jamais demandés, et ceux pour lesquels Claude n'a rien rendu ; pas ceux qu'il a écartés.
    manquants = {m: n for m, n in voulues.items() if connues.get(m, "") == ""}
    sens = sens_du_wiktionnaire(options.wiktionnaire, manquants) if manquants else {}
    a_faire = sorted(sens)
    if options.essai:
        for mot, definition in sorted(demander(random.sample(a_faire, options.essai), voulues, sens).items()):
            print(f"{mot} ({voulues[mot]}) : {definition}")
        return

    lots = [a_faire[i : i + PAR_LOT] for i in range(0, len(a_faire), PAR_LOT)]
    print(f"{len(a_faire)} mots à définir, {len(lots)} lots", flush=True)
    ecartes = []
    pool = ThreadPoolExecutor(EN_PARALLELE)
    try:
        futurs = [pool.submit(demander, lot, voulues, sens) for lot in lots]
        for n, futur in enumerate(as_completed(futurs), 1):
            nouvelles = futur.result()
            connues.update(nouvelles)
            ecartes += [m for m, d in nouvelles.items() if d is None]
            ecrire(connues)
            print(f"lot {n}/{len(lots)}", flush=True)
    finally:
        # Sur Ctrl-C, les lots pas encore partis ne partent pas.
        pool.shutdown(cancel_futures=True)
    valeurs = list(connues.values())
    vides, ecartees = valeurs.count(""), valeurs.count(None)
    print(f"definitions.json : {len(valeurs) - vides - ecartees} définitions, {vides} vides, {ecartees} écartées")
    # Un mot que Claude juge déplacé peut être un gros mot que SWEAR_WORD ne connaît pas encore.
    print("Écartés, à comparer avec SWEAR_WORD :", " ".join(sorted(ecartes)))


if __name__ == "__main__":
    main()
