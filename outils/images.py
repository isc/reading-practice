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
    "avion": "an airplane flying in the sky",
    "bague": "a golden ring with a sparkling gem",
    "baignoire": "a white bathtub full of soap bubbles, nothing else",
    "balançoire": "a child on a swing hanging from a tree branch",
    "baleine": "a big blue whale spouting water",
    "ballon": "a red balloon on a string",
    "banane": "a yellow banana",
    "bateau": "a small sailing boat on blue waves",
    "biberon": "a baby bottle with milk",
    "bicyclette": "a red bicycle seen from the side, no rider",
    "bol": "a bowl of cereal with milk",
    "bonbon": "a wrapped colorful candy",
    "bonhomme de neige": "a snowman with a carrot nose, a scarf and a hat",
    "bonnet": "a knitted winter beanie hat with a pompom",
    "bottes": "a pair of yellow rain boots",
    "bouche": "a smiling mouth with red lips and white teeth",
    "bougie": "a lit candle with a small flame",
    "bouquet": "a bouquet of colorful flowers tied with a ribbon",
    "boussole": "a compass with a red needle",
    "bouteille": "a glass bottle of water",
    "bouée": "a striped swim ring float",
    "bowling": "a bowling ball knocking down white bowling pins",
    "boîte": "a closed cardboard box",
    "bracelet": "a child's wrist wearing a colorful beaded bracelet",
    "brouette": "a garden wheelbarrow full of soil",
    "bureau": "a child's wooden desk with a chair, a lamp and books on it",
    "burger": "a hamburger with lettuce, tomato and cheese",
    "bus": "a yellow bus seen from the side",
    "bébé": "a smiling baby in a diaper sitting with a pacifier",
    "cactus": "a green cactus in a terracotta pot",
    "cadeau": "a wrapped gift box with a red ribbon bow",
    "café": "a white cup of hot coffee on a saucer, with steam",
    "camion": "a red truck seen from the side",
    "caméra": (
        "a smiling cameraman filming with a big professional video camera on his shoulder, red recording light on"
    ),
    "canard": "a yellow duck",
    "carotte": "an orange carrot with green leaves",
    "cartable": "a red school backpack satchel",
    "carte": "an unfolded treasure map with a dotted path and a red cross",
    "castor": "a brown beaver with a flat tail and big front teeth",
    "ceinture": "a brown leather belt with a golden buckle, buckled in a loop",
    "cerceau": "a happy child spinning a big colorful hula hoop around the waist",
    "cerf-volant": "a colorful kite flying in the sky with a tail of ribbons",
    "cerise": "two red cherries joined by their stems, with a green leaf",
    "champignon": "a red mushroom with white dots",
    "chaton": "a cute kitten sitting",
    "chou": "a green cabbage",
    "ciel": "a blue sky with a smiling sun and white fluffy clouds, in a rounded square frame",
    "cigale": (
        "a green cicada seen from the side, sitting on a tree branch, big eyes on the sides of a wide head, clear veined wings folded like a roof over its body"
    ),
    "cigogne": "a white stork with black wing tips, long red beak and long red legs",
    "cinq": "the number 5 as a big bold colorful digit",
    "cintre": "a wooden clothes hanger",
    "cinéma": "a cinema clapperboard next to a striped popcorn box",
    "cirque": "a red and white striped circus tent with a flag on top",
    "ciseaux": (
        "a pair of open scissors seen from the front, perfectly straight and symmetrical, pointing up, two round red finger loops at the bottom"
    ),
    "citron": "a yellow lemon with a green leaf",
    "citrouille": "an orange pumpkin",
    "clou": "a hammer hitting a metal nail into a wooden plank",
    "cochon": "a pink pig",
    "coquillage": "a pink and white seashell",
    "cornichon": "a green pickle gherkin",
    "couronne": "a golden royal crown with red and blue jewels",
    "couteau": "a kitchen knife",
    "crayon": "a yellow pencil",
    "crocodile": "a friendly green crocodile",
    "cube": "a single colorful toy cube block, three faces visible, plain faces",
    "cuillère": "a silver spoon",
    "cycliste": "a child riding a bicycle with a helmet, seen from the side",
    "cygne": "a white swan swimming, graceful curved neck, orange beak",
    "cyprès": "a tall narrow columnar dark green cypress tree with a brown trunk, standing on a little patch of grass",
    "céréales": "a bowl of breakfast cereal flakes with milk and a spoon",
    "cœur": "a red heart",
    "danseuse": "a little ballerina girl dancing in a pink tutu",
    "datte": "three wrinkled brown date fruits with a green palm leaf",
    "dauphin": "a smiling blue dolphin jumping out of the water",
    "dent": "a single white tooth, smiling and shiny",
    "dentifrice": "a tube of toothpaste squeezing out a blue and white stripe onto a toothbrush",
    "dentiste": "a smiling dentist woman in a white coat holding a dental mirror, next to a giant white tooth",
    "dessert": "a slice of strawberry cake with cream on a plate",
    "dessin": "a child's crayon drawing of a house and a sun on a sheet of paper, with crayons next to it",
    "diadème": "a sparkling silver tiara with jewels",
    "diamant": "a sparkling blue diamond gem",
    "dinde": "a turkey bird with a big fanned brown tail",
    "dinosaure": "a friendly green long-necked dinosaur",
    "dix": "the number 10 as big bold colorful digits",
    "doigt": "a child's hand with the index finger pointing up",
    "domino": "a single black domino tile with white dots",
    "donut": "a pink glazed donut with colorful sprinkles",
    "douche": "a shower head spraying water drops in a tiled bathroom corner",
    "doudou": "a soft cuddly teddy bunny comforter toy with floppy ears",
    "doudoune": "a puffy blue winter down jacket",
    "dragon": "a friendly green dragon with small wings",
    "drapeau": "the French flag with three vertical stripes blue, white and red, waving on a pole",
    "dromadaire": "a dromedary camel with a single hump, standing in the desert sand",
    "drone": "a small quadcopter drone flying",
    "dé": "a single white dice showing five dots",
    "déguisement": "a child wearing a superhero costume with a cape and a mask",
    "flocon": "a single white snowflake on a blue background circle",
    "fourmi": "a small black ant",
    "genou": "a child sitting with one knee bent up, a colorful bandage on the knee",
    "glaçon": "an ice cube",
    "hibou": "a brown owl with big round eyes perched on a branch",
    "hérisson": "a cute hedgehog",
    "lion": "a lion with a big mane",
    "loup": "a grey wolf howling",
    "loupe": "a magnifying glass",
    "maison": "a small house with a red roof and a chimney",
    "melon": "a cantaloupe melon cut in half, orange inside",
    "montre": "a wristwatch",
    "mouche": "a fly insect with transparent wings",
    "mouette": "a white seagull flying",
    "nounours": "a cute brown teddy bear",
    "ours": "a big brown grizzly bear walking on four legs in the forest",
    "panda": "a cute panda sitting and eating bamboo",
    "papillon": "a colorful butterfly with open wings",
    "parachute": "a colorful parachute with a person hanging below, in the sky",
    "parapluie": "an open red umbrella",
    "pastèque": "a slice of watermelon with black seeds",
    "peinture": "a painter's palette with paint blobs and a brush",
    "piano": "a black grand piano",
    "piment": "a red chili pepper",
    "pingouin": "a penguin standing on ice",
    "pirate": "a friendly pirate with an eye patch, a hat and a hook",
    "pizza": "a whole pizza with tomato, cheese and olives",
    "poire": "a green pear with a leaf",
    "poisson": "an orange fish swimming",
    "pomme": "a red apple with a leaf",
    "pont": "a stone arch bridge over a river",
    "popcorn": "a striped box of popcorn",
    "poubelle": "a green trash can with a lid",
    "poule": "a white hen",
    "poupée": "a doll with yarn hair and a dress",
    "poussin": "a fluffy yellow chick",
    "prince": "a young prince with a golden crown and a red cape",
    "puzzle": "four colorful jigsaw puzzle pieces fitting together",
    "pêche": "a fuzzy orange and pink peach fruit with a vertical crease line down the middle and a green leaf",
    "quad": "a child-sized quad bike, four-wheel ATV",
    "quai": "a train platform with a train arriving at the station",
    "quarante": "the number 40 as big bold colorful digits",
    "quartier": "one single orange segment wedge, shaped like a crescent smile, peeled",
    "quatorze": "the number 14 as big bold colorful digits",
    "quatre": "the number 4 as a big bold colorful digit",
    "quatre-quarts": "a golden pound cake loaf with one slice cut",
    "quatre-vingts": "the number 80 as big bold colorful digits",
    "question": "a big bold question mark",
    "quiche": "a quiche tart with a slice cut out",
    "quille": "a single white bowling pin with red stripes",
    "quinze": "the number 15 as big bold colorful digits",
    "roue": "a single bicycle wheel",
    "savon": "a pink bar of soap covered with white foam, with a few soap bubbles floating around",
    "souris": "a little grey mouse with big ears",
    "toupie": "a colorful spinning top toy",
    "violon": "a violin with its bow",
    "école": (
        "a teacher pointing at a green chalkboard in a classroom, two children sitting at school desks with raised hands, seen from behind"
    ),
    "écran": "a computer monitor screen on a stand, blue glowing screen",
}

# Une graine par mot, à changer pour obtenir d'autres essais.
# graine 1 : caméra donnait un appareil photo, cyprès un arbre en feu (« flame shaped »), école un
# bâtiment qu'on ne reconnaissait pas. Graine 5 : redessinés avec une description plus précise.
GRAINES = {
    "caméra": 3,
    "cyprès": 2,
    "école": 3,
    "pêche": 5,
    "quartier": 5,
    "clou": 5,
    "genou": 5,
    "ours": 5,
    "savon": 5,
    "dentiste": 5,
    "datte": 5,
    "bracelet": 5,
    "drapeau": 5,
    "baignoire": 5,  # graine 1 : un canard qui distrait
    "ciseaux": 9,  # graine 1 : une lame sans poignée ; graine 5 : une lame tordue
    "cigale": 5,  # graine 1 : une abeille
}


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
