"""Les images des phrases de « Lis à voix haute » (reading-game.html) : une scène par phrase, dessinée
par Z-Image Turbo sur charras comme les images des mots (outils/images.py). Ce n'est pas un sticker
détouré mais une illustration pleine page : elle se cache sous le papier bulle que la voix de
l'enfant fait éclater. WebP dans images/phrases/.

Deux temps, parce que c'est un œil qui choisit :
    python3 outils/scenes.py                     # 4 essais par scène sans image, et des planches
    python3 outils/scenes.py lama-rit=2 …        # garde l'essai n° 2 de lama-rit, en WebP

La liste des scènes est lue dans la page (les `image: "…"` de ses phrases) ; chacune doit être
décrite dans SCENES, en anglais. Une scène déjà en WebP n'est pas refaite : supprimer le fichier,
ou changer sa graine dans GRAINES, pour la redessiner.
"""

import re
import subprocess
import sys
from pathlib import Path

from images import ESSAIS, NB_ESSAIS, dessiner, planche
from voix import RACINE

PAGE = RACINE / "reading-game.html"
BANQUE = RACINE / "images" / "phrases"
COTE = 480  # l'image fait au plus 300 px de côté dans la page
PAR_PLANCHE = 8

STYLE = (
    "Children's picture book illustration, cute and funny, bold flat colors, thick dark outlines, "
    "simple colorful background filling the whole picture, centered composition. "
    "No text, no letters, no numbers, no words."
)

SCENES = {
    "lama-rit": "a llama laughing out loud, eyes closed, mouth wide open, in a green meadow",
    "rat-lit": "a little grey rat sitting on a cushion, reading a big open book",
    "lama-rame": "a llama rowing a small wooden rowboat on a blue lake",
    "lili-mule": "a little girl laughing while riding a brown mule in a field",
    "remi-mur": "a little boy sitting on top of an old stone wall, legs dangling",
    "lola-sol": "a little girl lying on her belly on a rug, reading a book",
    "mule-lit": "a muddy brown mule standing on top of a bed, its white sheets covered with big brown mud stains",
    "sami-riz": "a little boy who spilled a big bowl of rice all over the kitchen floor",
    "vache-lit": "a cow sitting in an armchair reading a book, wearing round glasses",
    "chat-souris": "a surprised cat face to face with a tiny mouse",
    "poule-tuba": "a hen playing a big shiny brass tuba",
    "loup-moto": "a grey wolf riding a red motorcycle on a road",
    "papa-sofa": "a father, a grown-up man with a beard, sleeping and snoring on a sofa in a living room",
    "tortue-jupe": "a turtle wearing a pink tutu skirt",
    "chat-niche": "a cat sleeping on the roof of a wooden dog house",
    "rat-velo": "a rat riding a small bicycle",
    "lion-ballon": "a lion playing with a big colorful beach ball",
    "roi-canard": "a king with a golden crown dancing with a duck",
    "lapin-tambour": "a rabbit playing a drum",
    "cochon-camion": "a pink pig driving a big truck",
    "dragon-soupe": "a small green dragon drinking a bowl of soup with a spoon",
    "poisson-bonbon": "an orange fish underwater holding a wrapped candy",
    "mouton-toit": "a sheep dancing on the roof of a house",
    "robot-bois": "a robot chopping wood with an axe in a forest",
    "reine-glace": "a queen with a crown licking a chocolate ice cream cone",
    "elephant-ski": "an elephant skiing down a snowy mountain slope",
    "chameau-chapeau": "a camel wearing a yellow hat in the desert",
    "grenouille-flaque": "a frog jumping into a puddle with a big splash",
    "chien-araignee": "a little puppy playing with a friendly smiling spider",
    "pompier-souris": "a firefighter jumping in fright away from a tiny mouse",
    "escargot-course": "a snail racing against a rabbit on a race track",
    "sorciere-balai": "a little witch flying on her broom across the night sky, past the moon",
    "dinosaure-dents": "a dinosaur in pajamas brushing its teeth in a bathroom",
    "papi-tresor": "a grandpa digging up a treasure chest full of gold coins in a garden",
    "fusee-lapins": "rabbits in a rocket taking off toward the moon",
    "crocodile-crepes": "a crocodile eating a tall stack of crepes in a kitchen",
    "escargots-fete": "snails having a party with balloons in the rain",
    "chevalier-dragon": "a knight in armor playing cards with a dragon at a table",
    "pingouin-plage": "a penguin wearing sunglasses sunbathing on a beach towel",
    "pirate-perroquet": "a pirate hiding a parrot in the drawer of a wooden desk",
    "fantome-lampes": "a small scared ghost in a bedroom full of lit lamps at night",
    "ours-chateau": "a family of bears building a huge sandcastle on a beach",
    "magicien-poule": "a surprised magician in a black cape holding his top hat upside down, a hen popping out of the hat",
    "robots-gateau": "two cute metal robots with square heads and antennas baking a chocolate birthday cake with candles",
    "pieuvre-batterie": "an octopus playing a drum kit at the bottom of the sea",
    "sorciere-chat": "a little witch next to a bubbling cauldron and a bright blue cat",
    "facteur-alien": "a mailman handing a letter to a little green alien next to a flying saucer",
    "hibou-etoiles": "an old owl on a branch telling a story to smiling stars in the night sky",
}

GRAINES = {
    "mule-lit": 2,  # graine 1 : la mule à côté du lit, pas dessus
    "papa-sofa": 2,  # graine 1 : un petit garçon, pas un papa
    "sorciere-balai": 2,  # la phrase a changé : elle « vole sur son balai »
    "magicien-poule": 2,  # graine 1 : la poule et le chapeau, pas de magicien
    "robots-gateau": 2,  # graine 1 : des peluches, pas des robots
}


def scenes() -> list[str]:
    return re.findall(r'image: "([^"]+)"', PAGE.read_text())


def webp(scene: str) -> Path:
    return BANQUE / f"{scene}.webp"


def essai(scene: str, n: int | str) -> Path:
    return ESSAIS / f"scene-{scene}-{GRAINES.get(scene, 1)}-{n}.png"


def garder(scene: str, n: int):
    BANQUE.mkdir(parents=True, exist_ok=True)
    dest = webp(scene)
    subprocess.run(["convert", essai(scene, n), "-resize", f"{COTE}x{COTE}", "-quality", "80", dest], check=True)
    print(f"{scene} : essai {n} → {dest.relative_to(RACINE)} ({dest.stat().st_size // 1024} Ko)")


def main(choix: list[str]):
    if choix:
        for c in choix:
            scene, n = c.rsplit("=", 1)
            garder(scene, int(n))
        return
    liste = [s for s in scenes() if not webp(s).exists()]
    sans_dessin = [s for s in liste if s not in SCENES]
    if sans_dessin:
        sys.exit(f"À décrire dans SCENES : {', '.join(sans_dessin)}")
    dessiner([s for s in liste if not essai(s, NB_ESSAIS - 1).exists()],
             invite=lambda s: f"{SCENES[s]}. {STYLE}", essai=essai, graine=lambda s: GRAINES.get(s, 1))
    for k in range(0, len(liste), PAR_PLANCHE):
        planche(f"scenes-{k // PAR_PLANCHE + 1}", liste[k:k + PAR_PLANCHE], essai, cote=240)


if __name__ == "__main__":
    main(sys.argv[1:])
