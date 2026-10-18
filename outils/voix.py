"""Les mots d'un jeu, dits par la voix de Pinson, en MP3 dans audio/<jeu>/.

La voix de Pinson vient de par-choeur (app/voix.py), dont on reprend tout : Chatterbox Multilingual
(Resemble AI, MIT) sur une voix française de référence (CML-TTS, CC-BY 4.0), choisie à l'oreille
contre Kokoro et Kyutai TTS ; plusieurs prises par mot, relues par Whisper, et la plus fidèle gardée
(un modèle génératif avale parfois un son) ; puis le rognage des silences et le volume. Ce script
n'ajoute que la liste des mots et les noms de fichiers.

La liste des mots est lue dans la page du jeu elle-même (les `word: "…"` de son tableau), pour que
le son ne diverge jamais de l'écran. Un mot déjà en MP3 n'est pas refait : supprimer le fichier
pour le régénérer.

Deux temps, deux environnements (ceux de par-choeur et de /opt/tts-essais, sur charras) :
    /opt/tts-essais/chatterbox/.venv/bin/python outils/voix.py generer b-ou-d
    ~/Code/par-choeur/spike/.venv/bin/python outils/voix.py choisir b-ou-d
VOIX_DEVICE=cpu (et VOIX_PRISES=4) quand la carte graphique est prise, par exemple par
l'assistant vocal de la maison : ~13 s par prise.
"""

import importlib.util
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
PRISES = Path.home() / ".cache" / "marzouzoute-voix"
NB_PRISES = int(os.environ.get("VOIX_PRISES", 6))


def pinson():
    """Le module de la voix de Pinson, dans par-choeur."""
    chemin = Path.home() / "Code" / "par-choeur" / "app" / "voix.py"
    spec = importlib.util.spec_from_file_location("pinson", chemin)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def slug(mot: str) -> str:
    """Le nom de fichier d'un mot : sans accents, espaces en tirets (« bonhomme-de-neige »).
    Même règle que audioFor() dans les pages."""
    sans = unicodedata.normalize("NFD", mot)
    sans = "".join(c for c in sans if unicodedata.category(c) != "Mn")
    return sans.replace(" ", "-")


def a_faire(jeu: str) -> list[str]:
    page = (RACINE / f"{jeu}.html").read_text()
    sortie = RACINE / "audio" / jeu
    return [m for m in re.findall(r'word: "([^"]+)"', page) if not (sortie / f"{slug(m)}.mp3").exists()]


def generer(jeu: str):
    voix = pinson()
    os.environ.setdefault("HF_HOME", "/opt/tts-essais/hf-cache")
    os.environ.setdefault("PKUSEG_HOME", "/opt/tts-essais/pkuseg")
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS

    # voix.chatterbox() charge le modèle sur la carte graphique : on choisit ici où le charger.
    modele = ChatterboxMultilingualTTS.from_pretrained(device=os.environ.get("VOIX_DEVICE", "cuda"), t3_model="v3")
    dossier = PRISES / jeu
    dossier.mkdir(parents=True, exist_ok=True)
    for mot in a_faire(jeu):
        for n in range(1, NB_PRISES + 1):
            # Un point final : sans lui, un mot seul finit parfois en suspens.
            voix.dire(modele, mot.capitalize() + ".", n, dossier / f"{slug(mot)}-{n}.wav")
        print(f"{mot} : {NB_PRISES} prises", flush=True)


def choisir(jeu: str):
    import soundfile as sf

    voix = pinson()
    dossier, sortie = PRISES / jeu, RACINE / "audio" / jeu
    sortie.mkdir(parents=True, exist_ok=True)
    rapport = {}
    for mot in a_faire(jeu):
        # À fidélité égale, la prise la plus courte : un mot seul n'a pas à traîner.
        notes = [(*voix.relire(f, mot), sf.info(str(f)).duration, f.name)
                 for f in sorted(dossier.glob(f"{slug(mot)}-[0-9]*.wav"))]
        if not notes:
            print(f"{mot} : aucune prise, lancer « generer » d'abord", flush=True)
            continue
        ecarts, entendu, _, meilleure = min(notes, key=lambda n: (n[0], n[2]))
        voix.mp3(dossier / meilleure, sortie / f"{slug(mot)}.mp3")
        rapport[mot] = {"prise": meilleure, "ecarts": ecarts, "entendu": entendu}
        alerte = "  ← à écouter" if ecarts else ""
        print(f"{mot:20} {meilleure:24} {ecarts} écart(s) : {entendu}{alerte}", flush=True)
    (dossier / "choix.json").write_text(json.dumps(rapport, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    {"generer": generer, "choisir": choisir}[sys.argv[1]](sys.argv[2])
