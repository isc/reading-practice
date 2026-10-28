"""Les mots d'un jeu, dits par la voix « Marie » de Mistral (Voxtral, celle de Tablito), en MP3
dans audio/<jeu>/.

Préférée à l'oreille à la voix de Pinson (Chatterbox, par-choeur), qui répétait parfois le mot.
Chaque mot est dit en plusieurs prises, et deux oreilles relisent chacune :
- Whisper dit quel mot il entend ; on compare par le son (« d'Inde » et « dinde » se prononcent
  pareil) avec l'outil phonétique de par-choeur. Mais son modèle de langue corrige vers le mot
  réel : il entendait « agneau » dans des prises qui disaient « ag-no » ou « anneau ».
- Le phonémiseur wav2vec2 de par-choeur écrit des sons, sans orthographe à deviner. Il est
  instable sur ces mots isolés (la même prise, avec un peu plus de silence autour, passe de
  « ʃu » à rien), alors il écoute chaque prise sous six variantes (marges, tempo, bruit) et
  vote : combien d'entre elles donnent exactement les sons attendus.
On garde la prise la plus fidèle pour Whisper, puis celle qui a le plus de votes, puis la plus
courte ; on en demande d'autres tant qu'aucune n'est fidèle pour les deux. Puis le rognage des
silences et le volume de par-choeur (app/voix.py, fonction mp3).

Le phonémiseur seul ne suffit pas à juger : sur les 127 MP3 (de 507) où il votait contre, Ivan en
a jugé 98 justes à l'écoute (octobre 2026). Mais quand une autre prise était juste sous toutes les
variantes, elle était la meilleure à l'oreille une fois sur deux, et le MP3 retenu était juste
l'autre fois. D'où son rôle : départager les prises que Whisper accepte.

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
PHONEMISEUR = "Cnam-LMSSC/wav2vec2-french-phonemizer-v2"  # celui de par-choeur (app/rythme.py)
SR = 16000  # ce qu'écoute le phonémiseur
# Les variantes d'une prise que le phonémiseur écoute : (silence autour en s, filtre ffmpeg, bruit ajouté).
# Une prise est juste pour lui s'il l'entend juste sous toutes. (Sous une hauteur changée par asetrate,
# il n'entendait plus rien de juste.)
VARIANTES = [(0.25, "", 0), (0.5, "", 0), (1.0, "", 0), (0.25, "", 3e-3), (0.25, ",atempo=0.8", 0),
             (0.25, ",atempo=0.65", 0)]
# Un fondu à l'attaque : une prise qui commence en pleine voix, collée au silence, fait un clic que le
# phonémiseur entendait « p » (« pagno » pour « agneau »).
FONDU = "afade=t=in:d=0.01"

# Ce que la voix lit mal : l'écran garde le mot, seule la voix lit ce texte-ci.
PRONONCIATION = {
    "dinde": "Dinnde.",  # « Dinde. » sort souvent « dine-dé »
    "burger": "Beurgueur.",  # sinon « burgé » ; « beurgeur » est bloqué par la modération de Mistral
    "quille": "Quille !",  # « Quille. » sort « qui », « Gilles »…
    "train": "Le train.",  # seul, « Train. » sort « R », « fin », « rien »…
    "hibou": "Hibou !",  # « Hibou. » sort « Ibu »
    "pont": "Ponts !",  # « Pont. » sort « fond », « bon »
    "feu": "Le feu.",  # seul, « Feu. » part en phrases inventées (« Je te remercie… »)
    "tasse": "La tasse.",  # « Tasse. » sort « tas », « l'as »
    "fraise": "La fraise.",  # « Fraise. » sort « faise », « fries », « treize »
    "phoque": "Le phoque.",  # seul, Whisper entend « fuck » à chaque prise
    "bébé": "Le bébé.",  # « Bébé. » part en babil (« Zata, bouboune, bébé ») à chaque prise
    "gauche": "À gauche.",  # « Gauche. » sort « gouche », ou part en phrases inventées
    "bottes": "Les bottes.",  # « Bottes. » : Whisper entend « bots »
    "quai": "Le quai.",  # « Quai. » : Whisper entend « OK »
    "est": "Ai.",  # « Est. » se lit comme le point cardinal
    "agneau": "L'agneau.",  # « Agneau. » sort « ag-no », « a-gui-gno » ou « anneau », que Whisper entend « agneau »
    # Lis à voix haute : Whisper entendait autre chose avec « Mot. »
    "rit": "Ri !",  # « rite »
    "lit": "Lit !",  # « oui »
    "sami": "Sami !",  # « amis »
    "en": "An !",  # « En. » : rien ; Whisper entend encore « un », à écouter
    "toit": "Le toit.",  # « à droite »
    "fait": "Fait !",  # « j'aime »
    "saute": "Saute !",  # « soutes »
    "papi": "Papy !",  # « tapis », « pathie » : à écouter
    "fond": "Le fond.",  # « fins »
    "quand": "Quand ?",  # « temps »
    "ont": "On !",  # Whisper entend « un » à chaque essai : à écouter
    "crêpes": "Crêpe !",  # « Crêpes. » fait siffler le s, que Whisper ne relève pas
    "tout": "Tout !",  # « Tout. » sortait faux à l'oreille sur 8 prises (le phonémiseur entendait « eu-tou »)
}


def slug(mot: str) -> str:
    """Le nom de fichier d'un mot : sans accents, espaces en tirets (« bonhomme-de-neige »).
    Même règle que audioFor() dans les pages."""
    sans = unicodedata.normalize("NFD", mot)
    sans = "".join(c for c in sans if unicodedata.category(c) != "Mn")
    return sans.replace(" ", "-")


def mots(jeu: str) -> list[str]:
    """Les mots d'un jeu, lus dans sa page : les `word: "…"` de son tableau, et les mots des
    `phrase: "…"` de « Lis à voix haute » (sans leurs marques de syllabes et de lettres muettes)."""
    page = (RACINE / f"{jeu}.html").read_text()
    liste = re.findall(r'word: "([^"]+)"', page)
    for phrase in re.findall(r'phrase:\s*"([^"]+)"', page):
        liste += [m.strip(".,!?;:").lower() for m in re.sub(r"[/()]", "", phrase).split()]
    return list(dict.fromkeys(liste))


# Des mots qui ne diffèrent que par l'accent partagent un fichier : bien seulement s'ils se disent
# pareil.
HOMOPHONES = {"a", "à"}


def a_faire(jeu: str) -> list[str]:
    liste = mots(jeu)
    par_slug = {}
    for m in liste:
        par_slug.setdefault(slug(m), set()).add(m)
    collisions = [" / ".join(sorted(v)) for v in par_slug.values() if len(v) > 1 and not v <= HOMOPHONES]
    if collisions:
        sys.exit(f"Même fichier pour des mots qui se disent autrement : {', '.join(collisions)}")
    sortie = RACINE / "audio" / jeu
    return [m for m in liste if not (sortie / f"{slug(m)}.mp3").exists()]


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


def phonemiseur():
    from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

    return Wav2Vec2Processor.from_pretrained(PHONEMISEUR), Wav2Vec2ForCTC.from_pretrained(PHONEMISEUR).to("cuda").eval()


def sons_normalises(api: str) -> str:
    """Des sons normalisés comme à l'outil phonétique de par-choeur (é/è, o ouvert ou fermé… confondus),
    et y pour ɥ, que le phonémiseur écrit dans « huit » quand espeak écrit y."""
    from phonetique import normaliser

    return normaliser(api).replace("ɥ", "y")


def ecouter(oreille, f: Path) -> list[str]:
    """Les sons que le phonémiseur entend dans chacune des VARIANTES d'une prise."""
    import numpy as np
    import torch

    proc, modele = oreille
    hasard = np.random.default_rng(0)
    filtrees = {}  # la prise passée par chaque filtre
    for _, filtre, _ in VARIANTES:
        if filtre not in filtrees:
            brut = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(f), "-ac", "1", "-af",
                                   FONDU + filtre, "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True)
            filtrees[filtre] = np.frombuffer(brut.stdout, dtype=np.float32)
    ecoutes = []
    for marge, filtre, bruit in VARIANTES:
        x = filtrees[filtre] + hasard.normal(0, bruit, len(filtrees[filtre])).astype(np.float32)
        silence = np.zeros(int(marge * SR), np.float32)
        entree = proc(np.concatenate([silence, x, silence]), sampling_rate=SR, return_tensors="pt").input_values
        with torch.inference_mode():
            ids = modele(entree.to("cuda")).logits[0].argmax(-1)
        ecoutes.append(sons_normalises(proc.tokenizer.decode(ids.tolist())))
    return ecoutes


def attendus(mot: str, texte: str) -> set[str]:
    """Les sons attendus d'une prise, normalisés : ceux du vrai mot, derrière les mots que le texte lu
    ajoute (« Le feu. »), selon espeak et, pour un mot seul, selon le dictionnaire de par-choeur aussi
    (« cheveu » : « ʃvø » ou « ʃøvø »). Jamais ceux du texte lu, qu'espeak lit mal quand PRONONCIATION
    change la graphie (« Dinnde. » : « dind »)."""
    from phonetique import _phrases, prononcer_expressions, sons
    from texte import words

    lu, vrai = tuple(words(texte)), tuple(words(mot))
    phrase = lu[:max(len(lu) - len(vrai), 0)] + vrai
    prononcer_expressions([phrase])
    resultat = {_phrases[phrase]} | (set(sons(mot)) if len(phrase) == 1 else set())
    return {sons_normalises(s.replace("ʼ", "")) for s in resultat}  # ʼ : le h aspiré du dictionnaire


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
    oreille = phonemiseur()
    dossier, sortie = PRISES / jeu, RACINE / "audio" / jeu
    dossier.mkdir(parents=True, exist_ok=True)
    sortie.mkdir(parents=True, exist_ok=True)
    rapport_f = dossier / "choix.json"
    rapport = json.loads(rapport_f.read_text()) if rapport_f.exists() else {}
    for mot in a_faire(jeu):
        texte = PRONONCIATION.get(mot, mot.capitalize() + ".")
        sons_attendus = attendus(mot, texte)
        prises = []
        for n in range(1, NB_MAX + 1):
            # Le phonémiseur conteste à tort trois fois sur quatre : les prises de plus qu'il fait
            # demander sont souvent inutiles, mais peu chères, et l'autre fois elles trouvent mieux.
            if n > NB_PRISES and fidele(min(prises, key=rang)):
                break
            f = dossier / f"{slug(mot)}-{n}.wav"
            if not f.exists():
                dire(texte, f)
            segments, _ = whisper.transcribe(str(f), language="fr", beam_size=5, temperature=0.0)
            entendu = " ".join(s.text.strip() for s in segments)
            attendu, hyp = tuple(words(mot)), tuple(words(entendu))
            prononcer_expressions([attendu, hyp])
            # Écart en sons entre ce qui est dit et le mot. Une prise trop longue pour son texte a bavardé
            # autour du mot (« J'lis, j'lis… bébé »), ce que Whisper n'entend pas toujours : elle ne
            # compte pas.
            duree = sf.info(str(f)).duration
            ecart = _distance(_phrases[attendu], _phrases[hyp]) + (99 if duree > 0.5 + 0.08 * len(texte) else 0)
            sons = ecouter(oreille, f)
            prises.append({"prise": f.name, "ecart": ecart, "votes": sum(s in sons_attendus for s in sons),
                           "duree": duree, "entendu": entendu, "sons": sons})
        meilleure = min(prises, key=rang)
        try:
            pinson.mp3(dossier / meilleure["prise"], sortie / f"{slug(mot)}.mp3")
        except subprocess.CalledProcessError:
            court(dossier / meilleure["prise"], sortie / f"{slug(mot)}.mp3", pinson.ROGNER)
        rapport[mot] = meilleure
        sons = meilleure["sons"]
        alerte = "" if fidele(meilleure) else "  ← à écouter"
        print(f"{mot:20} {meilleure['prise']:24} {meilleure['ecart']} son(s) d'écart : {meilleure['entendu']} ; "
              f"sons {max(sons, key=sons.count)} ({meilleure['votes']}/{len(VARIANTES)}){alerte}", flush=True)
    rapport_f.write_text(json.dumps(rapport, ensure_ascii=False, indent=1))


def rang(prise: dict):
    """L'ordre des prises : la plus fidèle pour Whisper, puis celle que le phonémiseur entend juste sous le
    plus de variantes, puis la plus courte."""
    return prise["ecart"], -prise["votes"], prise["duree"]


def fidele(prise: dict) -> bool:
    """Fidèle pour les deux oreilles."""
    return prise["ecart"] == 0 and prise["votes"] == len(VARIANTES)


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
