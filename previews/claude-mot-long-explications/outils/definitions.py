"""Les définitions pour enfants des mots peu courants du mot le plus long : outils/definitions.json,
{lemme: définition}, que outils/explications.py range ensuite par lettre.

Les sens viennent du Wiktionnaire (extraction de kaikki.org, licence CC BY-SA 4.0) ; Claude les
réécrit pour un enfant de CM1, sans rien inventer, par lots de 40 mots envoyés à l'API Batches (deux
fois moins chère, le résultat arrive en moins d'une heure). Un mot que Claude juge déplacé pour un
enfant (grossier, sexuel, injurieux) reste sans définition : null dans le fichier ; un mot dont aucun
sens n'est clair, "". Les mots déjà traités sont gardés, seuls les nouveaux partent à l'API (environ
20 $ pour les 34 000 mots d'octobre 2026).

Sur charras, dans un environnement qui a le paquet anthropic, avec la clé de ~/.anthropic/api-key
(cf. ~/.claude/CLES-API.md) :
    curl -LO https://kaikki.org/frwiktionary/raw-wiktextract-data.jsonl.gz
    ANTHROPIC_API_KEY=$(cat ~/.anthropic/api-key) python outils/definitions.py raw-wiktextract-data.jsonl.gz
L'option --essai N définit N mots au hasard sans rien écrire, pour juger la qualité avant de payer.
Si le script s'arrête avant la fin du batch, --reprendre msgbatch_… en relit les résultats sans repayer.
"""

import argparse
import gzip
import json
import random
import time

import anthropic
from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
from anthropic.types.messages.batch_create_params import Request

import explications

MODELE = "claude-opus-5-5"
PAR_LOT = 40
POS = {"verbe": "verb", "nom": "noun", "adjectif": "adj", "adverbe": "adv", "interjection": "intj"}

CONSIGNE = """Tu écris les définitions d'un jeu de lettres pour des enfants de 7 à 11 ans. On te donne \
des mots du français, avec leur nature et les sens que leur donne le Wiktionnaire.

Pour chaque mot :
- Écris une seule définition, courte (une quinzaine de mots au plus), avec des mots qu'un enfant de \
CM1 connaît.
- Prends le sens le plus courant, ou le plus parlant pour un enfant, parmi ceux qu'on te donne. \
N'invente aucun sens : si aucun n'est clair, laisse la définition vide.
- Ne répète pas le mot défini. Commence par une minuscule, sans point final.
- Pour un verbe, commence par un verbe à l'infinitif (« faire un trou dans la terre »). Pour un nom, \
par un article (« un petit objet sans valeur »). Pour un adjectif, par « qui » (« qui a deux couleurs »).
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


def sens_du_wiktionnaire(chemin, voulues):
    """Pour chaque lemme voulu, ses sens : ceux de sa nature d'abord, quatre au plus."""
    sens = {}
    with gzip.open(chemin, "rt", encoding="utf-8") as f:
        for ligne in f:
            if '"lang_code": "fr"' not in ligne:
                continue
            entree = json.loads(ligne)
            mot = entree.get("word")
            if entree.get("lang_code") != "fr" or mot not in voulues:
                continue
            autre_nature = entree.get("pos") != POS.get(voulues[mot])
            for s in entree.get("senses", []):
                glose = " ".join(s.get("glosses", [])[-1:]).strip()[:300]
                if glose:
                    reperes = s.get("tags", []) + s.get("raw_tags", []) + s.get("topics", [])
                    texte = glose + (f" [{', '.join(reperes)}]" if reperes else "")
                    sens.setdefault(mot, []).append((autre_nature, texte))
    return {mot: [t for _, t in sorted(liste, key=lambda x: x[0])][:4] for mot, liste in sens.items()}


def requete(lot, voulues, sens):
    mots = [{"mot": m, "nature": voulues[m], "sens": sens[m]} for m in lot]
    return MessageCreateParamsNonStreaming(
        model=MODELE,
        max_tokens=16000,
        output_config={"effort": "low", "format": {"type": "json_schema", "schema": SCHEMA}},
        system=CONSIGNE,
        messages=[{"role": "user", "content": json.dumps(mots, ensure_ascii=False)}],
    )


def lire(message, admis):
    """Les définitions d'une réponse : "" quand aucun sens n'est clair, None quand le mot ne convient pas à
    un enfant ; {} si Claude a refusé le lot."""
    if message.stop_reason != "end_turn":
        print(f"{message.id} : arrêt {message.stop_reason}")
        return {}
    texte = next(b.text for b in message.content if b.type == "text")
    rendus = json.loads(texte)["mots"]
    return {m["mot"]: (m["definition"].strip() if m["convient"] else None) for m in rendus if m["mot"] in admis}


def main():
    arguments = argparse.ArgumentParser()
    arguments.add_argument("wiktionnaire", nargs="?", help="raw-wiktextract-data.jsonl.gz de kaikki.org")
    arguments.add_argument("--essai", type=int, default=0, help="définir N mots au hasard, sans rien écrire")
    arguments.add_argument("--reprendre", help="relire les résultats d'un batch déjà lancé (msgbatch_…)")
    options = arguments.parse_args()

    _, voulues = explications.analyser()
    connues = explications.lire_definitions()
    client = anthropic.Anthropic()

    if options.reprendre:
        batch = client.messages.batches.retrieve(options.reprendre)
    else:
        sens = sens_du_wiktionnaire(options.wiktionnaire, voulues)
        a_faire = sorted(m for m in voulues if m in sens and m not in connues)
        if options.essai:
            lot = random.sample(a_faire, options.essai)
            message = client.messages.create(**requete(lot, voulues, sens))
            for mot, definition in sorted(lire(message, lot).items()):
                print(f"{mot} ({voulues[mot]}) : {definition}")
            print(message.usage)
            return
        lots = [a_faire[i : i + PAR_LOT] for i in range(0, len(a_faire), PAR_LOT)]
        batch = client.messages.batches.create(
            requests=[Request(custom_id=f"lot-{i}", params=requete(lot, voulues, sens)) for i, lot in enumerate(lots)]
        )
        # À noter : si le script s'arrête avant la fin, --reprendre récupère ce qui est déjà payé.
        print(f"{len(a_faire)} mots à définir, {len(lots)} lots : batch {batch.id}")
    while batch.processing_status != "ended":
        time.sleep(60)
        batch = client.messages.batches.retrieve(batch.id)

    nouvelles = {}
    for resultat in client.messages.batches.results(batch.id):
        if resultat.result.type == "succeeded":
            nouvelles.update(lire(resultat.result.message, voulues))
        else:
            print(resultat.custom_id, resultat.result.type)
    connues.update(nouvelles)
    texte = json.dumps(dict(sorted(connues.items())), ensure_ascii=False, indent=0)
    explications.DEFINITIONS.write_text(texte + "\n", encoding="utf-8")
    print(f"definitions.json : {sum(1 for d in connues.values() if d)} définitions, "
          f"{sum(1 for d in connues.values() if d is None)} mots écartés")
    # Un mot que Claude juge déplacé peut être un gros mot que SWEAR_WORD ne connaît pas encore.
    print("Écartés, à comparer avec SWEAR_WORD :", " ".join(sorted(m for m, d in nouvelles.items() if d is None)))


if __name__ == "__main__":
    main()
