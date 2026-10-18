"""Les mots d'un jeu, dits par la voix « Marie » de Mistral (Voxtral, celle de Tablito), en MP3
dans audio/<jeu>/.

Préférée à l'oreille à la voix de Pinson (Chatterbox, par-choeur), qui répétait parfois le mot.
Chaque mot est dit en plusieurs prises ; Whisper relit chacune, on compare par le son (« d'Inde »
et « dinde » se prononcent pareil) avec l'outil phonétique de par-choeur, et on garde la plus
fidèle. Puis le rognage des silences et le volume de par-choeur (app/voix.py, fonction mp3).

La liste des mots est lue dans la page du jeu elle-même (les `word: "…"` de son tableau), pour que
le son ne diverge jamais de l'écran. Un mot déjà en MP3 n'est pas refait : supprimer le fichier
pour le régénérer.

Sur charras, dans l'environnement Whisper de par-choeur, avec la clé de ~/.mistral/api-key
(cf. ~/.claude/MISTRAL.md) :
    ~/Code/par-choeur/spike/.venv/bin/python outils/voix.py b-ou-d
"""

import base64
import importlib.util
import json
import re
import subprocess
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
PAR_CHOEUR = Path.home() / "Code" / "par-choeur"
PRISES = Path.home() / ".cache" / "marzouzoute-voix"
NB_PRISES, NB_MAX = 3, 8  # trois prises, et d'autres tant qu'aucune n'est juste
MODELE, VOIX = "voxtral-mini-tts-2603", "e0580ce5-e63c-4cbe-88c8-a983b80c5f1f"  # Marie - Curious (fr)

# Ce que la voix lit mal : l'écran garde le mot, seule la voix lit ce texte-ci.
PRONONCIATION = {
    "dinde": "Dinnde.",  # « Dinde. » sort souvent « dine-dé »
    "burger": "Beurgueur.",  # sinon « burgé » ; « beurgeur » est bloqué par la modération de Mistral
    "quille": "Quille !",  # « Quille. » sort « qui », « Gilles »…
    "hibou": "Hibou !",  # « Hibou. » sort « Ibu »
    "pont": "Ponts !",  # « Pont. » sort « fond », « bon »
}


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


def dire(texte: str, f: Path):
    """Une prise de Marie, en WAV. Réessaie sur les erreurs passagères (429, 5xx, réseau)."""
    cle = (Path.home() / ".mistral" / "api-key").read_text().strip()
    corps = json.dumps({"model": MODELE, "input": texte, "voice_id": VOIX, "response_format": "wav"}).encode()
    for essai in range(5):
        requete = urllib.request.Request("https://api.mistral.ai/v1/audio/speech", data=corps, method="POST",
                                         headers={"Authorization": f"Bearer {cle}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(requete, timeout=60) as r:
                f.write_bytes(base64.b64decode(json.load(r)["audio_data"]))
            return
        except urllib.error.HTTPError as e:
            if e.code != 429 and e.code < 500:
                raise
        except urllib.error.URLError:
            pass
        time.sleep(2 ** essai)
    raise RuntimeError(f"Mistral ne répond pas pour « {texte} »")


def main(jeu: str):
    sys.path.insert(0, str(PAR_CHOEUR / "serveur"))
    sys.path.insert(0, str(PAR_CHOEUR / "spike"))
    import soundfile as sf
    import torch  # noqa: F401 — charge cuBLAS/cuDNN, que Whisper (CTranslate2) ne trouve pas seul
    from faster_whisper import WhisperModel
    from phonetique import _distance, _phrases, prononcer_expressions
    from texte import words

    spec = importlib.util.spec_from_file_location("pinson", PAR_CHOEUR / "app" / "voix.py")
    pinson = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(pinson)

    whisper = WhisperModel("large-v3", device="cuda", compute_type="int8_float16")
    dossier, sortie = PRISES / jeu, RACINE / "audio" / jeu
    dossier.mkdir(parents=True, exist_ok=True)
    sortie.mkdir(parents=True, exist_ok=True)
    rapport_f = dossier / "choix.json"
    rapport = json.loads(rapport_f.read_text()) if rapport_f.exists() else {}
    for mot in a_faire(jeu):
        texte = PRONONCIATION.get(mot, mot.capitalize() + ".")
        notes = []
        for n in range(1, NB_MAX + 1):
            if n > NB_PRISES and min(notes)[0] == 0:
                break
            f = dossier / f"{slug(mot)}-{n}.wav"
            if not f.exists():
                dire(texte, f)
            segments, _ = whisper.transcribe(str(f), language="fr", beam_size=5, temperature=0.0)
            entendu = " ".join(s.text.strip() for s in segments)
            attendu, hyp = tuple(words(mot)), tuple(words(entendu))
            prononcer_expressions([attendu, hyp])
            # Écart en sons entre ce qui est dit et le mot ; à égalité, la prise la plus courte.
            notes.append((_distance(_phrases[attendu], _phrases[hyp]), sf.info(str(f)).duration, f.name, entendu))
        ecart, _, meilleure, entendu = min(notes)
        try:
            pinson.mp3(dossier / meilleure, sortie / f"{slug(mot)}.mp3")
        except subprocess.CalledProcessError:
            court(dossier / meilleure, sortie / f"{slug(mot)}.mp3", pinson.ROGNER)
        rapport[mot] = {"prise": meilleure, "ecart": ecart, "entendu": entendu}
        alerte = "  ← à écouter" if ecart else ""
        print(f"{mot:20} {meilleure:24} {ecart} son(s) d'écart : {entendu}{alerte}", flush=True)
    rapport_f.write_text(json.dumps(rapport, ensure_ascii=False, indent=1))


def court(src: Path, dst: Path, rogner: str):
    """Un mot si bref (moins d'une demi-seconde) que loudnorm ne peut pas mesurer son volume : on le
    règle sur sa crête, au niveau où culminent les autres mots."""
    mesure = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-af", f"{rogner},volumedetect",
                             "-f", "null", "-"], capture_output=True, text=True, check=True)
    crete = float(re.search(r"max_volume: (-?[\d.]+) dB", mesure.stderr).group(1))
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src), "-af",
                    f"{rogner},volume={-3 - crete}dB,adelay=120", "-ar", "44100", "-ac", "1", "-c:a", "libmp3lame",
                    "-b:a", "96k", str(dst)], check=True)


if __name__ == "__main__":
    main(sys.argv[1])
