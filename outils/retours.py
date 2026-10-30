"""Les messages « Écris-nous » de l'accueil (table marzouzoute_feedback, outils/retours.sql) : les lire,
les ranger.

La page ne peut qu'ajouter des messages. On les lit à côté, par l'API Management de Supabase, avec le
jeton personnel de la CLI (~/.supabase/access-token, cf. ~/.claude/SUPABASE.md) : rien à installer, et
aucune clé dans le dépôt. ⚠ Ce jeton ouvre tout le compte : ne jamais l'afficher ni le recopier.

    python3 outils/retours.py                  # les messages à traiter, le plus récent d'abord
    python3 outils/retours.py --tous           # avec ceux déjà traités
    python3 outils/retours.py voir <id>        # un message, avec tout son contexte
    python3 outils/retours.py traite <id>…     # traité : il sort de la liste
    python3 outils/retours.py rouvre <id>…     # il y revient
    python3 outils/retours.py appliquer        # (ré)applique outils/retours.sql au projet

Un <id> : ses 8 premiers caractères, que montre la liste. Un début qui désigne plusieurs messages est
refusé plutôt que deviné.

C'est le pendant de arabesque/scripts/feedback.mjs, pour la table d'à côté.
"""

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

PROJET = "mtihhulokbhhvkomlmmk"  # celui d'Arabesque, cf. outils/retours.sql
JETON = Path.home() / ".supabase" / "access-token"
SQL = Path(__file__).with_name("retours.sql")


def requete(sql):
    try:
        jeton = JETON.read_text().strip()
    except FileNotFoundError:
        sys.exit(f"Pas de jeton Supabase dans {JETON} : https://supabase.com/dashboard/account/tokens")
    demande = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJET}/database/query",
        data=json.dumps({"query": sql}).encode(),
        headers={
            "Authorization": f"Bearer {jeton}",
            "Content-Type": "application/json",
            "User-Agent": "marzouzoute-retours",
        },
    )
    try:
        with urllib.request.urlopen(demande, timeout=60) as reponse:
            return json.load(reponse)
    except urllib.error.HTTPError as erreur:
        sys.exit(f"Supabase répond {erreur.code} : {erreur.read().decode(errors='replace')}")


def lisibles(debuts):
    """Les débuts d'id, une fois vérifiés : ils vont tels quels dans le SQL."""
    for debut in debuts:
        if not re.fullmatch(r"[0-9a-f]{4,36}", debut):
            sys.exit(f"id illisible : {debut}")
    return debuts


def un_seul(debut, lignes):
    if len(lignes) != 1:
        sys.exit(f"{debut} : {'aucun message' if not lignes else 'plusieurs messages'}")
    return lignes[0]


def ids(debuts):
    """Les id complets des débuts donnés, ou l'arrêt si l'un est inconnu ou ambigu."""
    conditions = " or ".join(f"id::text like '{debut}%'" for debut in lisibles(debuts))
    connus = [ligne["id"] for ligne in requete(f"select id::text from public.marzouzoute_feedback where {conditions}")]
    return [un_seul(debut, [i for i in connus if i.startswith(debut)]) for debut in debuts]


def lister(tous):
    lignes = requete(f"""
        select id::text, status, category, game, email, message, context->>'page' as page,
               to_char(created_at at time zone 'Europe/Paris', 'YYYY-MM-DD HH24:MI') as quand
          from public.marzouzoute_feedback
         {"" if tous else "where status = 'new'"}
         order by created_at desc
         limit 100""")
    if not lignes:
        print("Aucun message." if tous else "Rien à traiter.")
        return
    for ligne in lignes:
        etiquettes = " · ".join(filter(None, [
            ligne["category"],
            ligne["game"],
            "preview" if "/previews/" in (ligne["page"] or "") else None,
        ]))
        fait = " ✓" if ligne["status"] == "done" else ""
        print(f"\n\033[1m{ligne['id'][:8]}\033[0m{fait}  {ligne['quand']}  {ligne['email'] or 'sans adresse'}")
        if etiquettes:
            print(f"         {etiquettes}")
        for texte in ligne["message"].splitlines():
            print(f"  {texte}")
    a_traiter = sum(ligne["status"] == "new" for ligne in lignes)
    print(f"\n{a_traiter} à traiter.")


def voir(debut):
    [debut] = lisibles([debut])
    lignes = requete(f"select to_jsonb(f) as message from public.marzouzoute_feedback f where id::text like '{debut}%'")
    print(json.dumps(un_seul(debut, lignes)["message"], ensure_ascii=False, indent=2))


def marquer(debuts, statut):
    liste = ", ".join(f"'{i}'" for i in ids(debuts))
    requete(f"update public.marzouzoute_feedback set status = '{statut}' where id in ({liste})")
    print(f"{len(debuts)} message(s) {'traité(s)' if statut == 'done' else 'rouvert(s)'}.")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--tous", action="store_true", help="avec les messages déjà traités")
    actions = parser.add_subparsers(dest="action")
    actions.add_parser("voir").add_argument("id")
    actions.add_parser("traite").add_argument("ids", nargs="+")
    actions.add_parser("rouvre").add_argument("ids", nargs="+")
    actions.add_parser("appliquer")
    args = parser.parse_args()

    if args.action == "voir":
        voir(args.id)
    elif args.action == "traite":
        marquer(args.ids, "done")
    elif args.action == "rouvre":
        marquer(args.ids, "new")
    elif args.action == "appliquer":
        requete(SQL.read_text())
        print(f"{SQL.name} appliqué au projet {PROJET}.")
    else:
        lister(args.tous)


if __name__ == "__main__":
    main()
