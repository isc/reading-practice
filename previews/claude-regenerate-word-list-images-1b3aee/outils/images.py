"""Les images des mots, dessinées par Z-Image Turbo sur charras, dans un même style « sticker », en
WebP dans images/mots/, une banque commune à tous les jeux. Elles remplacent les emojis, qui ne
s'affichent pas pareil sur Android et iOS et n'existent pas pour tous les mots (🦩 pour cigogne).

Deux temps, parce que c'est un œil qui choisit :
    python3 outils/images.py c-doux-dur              # 4 essais par mot sans image, et une planche
    python3 outils/images.py c-doux-dur cigogne=2 …  # garde l'essai n° 2 de cigogne, détouré, en WebP

La liste des mots est lue dans la page du jeu (les `word: "…"` de son tableau), comme voix.py. Chaque
mot doit avoir son dessin décrit dans DESSINS, en anglais (le modèle le comprend mieux). Un mot déjà
en WebP n'est pas refait : supprimer le fichier, ou changer sa graine dans GRAINES, pour le redessiner.

Le modèle de l'assistant vocal occupe la moitié de la carte : Ollama le décharge le temps du dessin,
puis le recharge (vram.py de ddmr, qui fait de même pour son OCR).
"""

import os
import subprocess
import sys
from pathlib import Path

from voix import RACINE, mots, slug

ESSAIS = Path.home() / ".cache" / "marzouzoute-images"
SD = Path("/opt/sd")
BANQUE = RACINE / "images" / "mots"
NB_ESSAIS, TAILLE = 4, 768  # TAILLE : le dessin ; il est réduit à COTE une fois choisi
COTE = 256  # l'image du mot fait 6 rem, soit 96 px, sur un écran 3×

STYLE = (
    "cartoon sticker, thick dark outline, bold flat colors, playful kawaii style, white sticker border. "
    "Single subject, centered, isolated on a plain white background, no text, no letters, no numbers."
)

DESSINS = {
    "cadeau": "a wrapped gift box with a red ribbon bow",
    "café": "a white cup of hot coffee on a saucer, with steam",
    "caméra": "a smiling cameraman filming with a big professional video camera on his shoulder, red recording light on",
    "carotte": "an orange carrot with green leaves",
    "carte": "an unfolded treasure map with a dotted path and a red cross",
    "ceinture": "a brown leather belt with a golden buckle, buckled in a loop",
    "cerceau": "a happy child spinning a big colorful hula hoop around the waist",
    "cerise": "two red cherries joined by their stems, with a green leaf",
    "ciel": "a blue sky with a smiling sun and white fluffy clouds, in a rounded square frame",
    "cigogne": "a white stork with black wing tips, long red beak and long red legs",
    "cinéma": "a cinema clapperboard next to a striped popcorn box",
    "citron": "a yellow lemon with a green leaf",
    "couronne": "a golden royal crown with red and blue jewels",
    "cube": "a single colorful toy cube block, three faces visible, plain faces",
    "cycliste": "a child riding a bicycle with a helmet, seen from the side",
    "cygne": "a white swan swimming, graceful curved neck, orange beak",
    "cyprès": "a tall narrow columnar dark green cypress tree with a brown trunk, standing on a little patch of grass",
    "cœur": "a red heart",
    "école": "a small school building with a bell tower and a clock, a flag on top",
    "écran": "a computer monitor screen on a stand, blue glowing screen",
}

# Une graine par mot, à changer pour obtenir d'autres essais.
# graine 1 : caméra donnait un appareil photo, cyprès un arbre en feu (« flame shaped »)
GRAINES = {"caméra": 3, "cyprès": 2}


def webp(mot: str) -> Path:
    return BANQUE / f"{slug(mot)}.webp"


def essai(mot: str, n: int | str) -> Path:
    return ESSAIS / f"{slug(mot)}-{GRAINES.get(mot, 1)}-{n}.png"


def dessiner(a_faire: list[str]):
    sys.path.insert(0, str(Path.home() / "Code" / "ddmr" / "tools" / "mots"))
    from vram import carte_libre

    m = SD / "models"
    env = dict(os.environ, LD_LIBRARY_PATH=str(SD / "lib"))
    ESSAIS.mkdir(parents=True, exist_ok=True)
    with carte_libre():
        for mot in a_faire:
            r = subprocess.run(
                [SD / "bin" / "sd-cli", "--diffusion-model", m / "z_image_turbo-Q8_0.gguf", "--vae", m / "ae.sft",
                 "--llm", m / "Qwen3-4B-Instruct-2507-Q8_0.gguf", "-p", f"{DESSINS[mot]}. {STYLE}",
                 "--cfg-scale", "1.0", "--steps", "8", "-H", str(TAILLE), "-W", str(TAILLE), "--diffusion-fa", "--vae-tiling",
                 "--offload-to-cpu", "-s", str(GRAINES.get(mot, 1)), "-b", str(NB_ESSAIS), "-o", essai(mot, "%d"),
                 "--output-begin-idx", "0"],
                env=env, capture_output=True, text=True)
            if r.returncode:
                sys.exit(f"{mot} : sd-cli a échoué\n{r.stdout[-2000:]}")
            print(f"{mot} dessiné", flush=True)


def planche(jeu: str, liste: list[str]):
    """Les essais de chaque mot sur une ligne, numérotés, pour choisir."""
    lignes = []
    for mot in liste:
        lignes += ["-label", f"{mot}", "xc:white"]
        for n in range(NB_ESSAIS):
            lignes += ["-label", str(n), str(essai(mot, n))]
    f = ESSAIS / f"planche-{jeu}.jpg"
    subprocess.run(["montage", *lignes, "-tile", f"{NB_ESSAIS + 1}x", "-geometry", "200x200+4+4", "-pointsize", "18",
                    "-quality", "85", f], check=True)
    print(f"planche : {f}")


def garder(mot: str, n: int):
    """L'essai choisi, détouré : le blanc du fond est rendu transparent depuis les coins, sans
    toucher au blanc du sticker, que son contour sombre isole du fond."""
    dest = webp(mot)
    BANQUE.mkdir(parents=True, exist_ok=True)
    coins = [f"color {x},{y} floodfill" for x in (0, TAILLE - 1) for y in (0, TAILLE - 1)]
    subprocess.run(["convert", essai(mot, n), "-alpha", "set", "-fuzz", "6%", "-fill", "none",
                    *[a for c in coins for a in ("-draw", c)], "-trim", "+repage", "-resize", f"{COTE}x{COTE}",
                    "-gravity", "center", "-background", "none", "-extent", f"{COTE}x{COTE}",
                    "-define", "webp:alpha-quality=90", "-quality", "82", dest], check=True)
    print(f"{mot} : essai {n} → {dest.relative_to(RACINE)} ({dest.stat().st_size // 1024} Ko)")


def main(jeu: str, choix: list[str]):
    if choix:
        for c in choix:
            mot, n = c.rsplit("=", 1)
            garder(mot, int(n))
        return
    liste = [m for m in mots(jeu) if not webp(m).exists()]
    sans_dessin = [m for m in liste if m not in DESSINS]
    if sans_dessin:
        sys.exit(f"À décrire dans DESSINS : {', '.join(sans_dessin)}")
    dessiner([m for m in liste if not essai(m, NB_ESSAIS - 1).exists()])
    planche(jeu, liste)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
