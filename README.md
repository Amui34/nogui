# Nogui — site vitrine

Site statique (HTML / CSS / JS), sans dépendances ni build.

## Lancer en local

```bash
python3 -m http.server 8765
```

Puis ouvrir http://localhost:8765

(Il faut un serveur local : ouvrir `index.html` directement en double-cliquant empêche le chargement des produits.)

## Où déposer les fichiers

| Quoi | Où | Nom attendu |
|---|---|---|
| Logo | `assets/logo/` | `logo.png` (barre et pied de page) et `soleil.png` (soleil animé, favicon), détourés à partir de `logo-horizontal.jpg` |
| Photo d'accueil | `assets/espace/` | `hero.jpg` |
| Photos de l'espace | `assets/espace/` | `espace-1.jpg`, `espace-2.jpg`, `espace-3.jpg` |
| Portrait du designer | `assets/designer/` | `portrait.jpg` |
| Photos produits | `assets/produits/` | libre, référencé dans `data/produits.json` |

Tant qu'une image est absente, le site affiche un emplacement grisé avec le nom du fichier attendu.

## Ajouter / modifier un produit

Éditer `data/produits.json`. Chaque produit :

```json
{
  "nom": "Tabouret Ligne",
  "categorie": "Mobilier",
  "prix": 320,
  "image": "assets/produits/tabouret-ligne.jpg",
  "badge": "Nouveau",
  "vendu": false,
  "description": "Texte libre.",
  "details": { "Matière": "Chêne", "Dimensions": "H 45 cm" }
}
```

- `prix` : nombre (affiché en €) ou texte (`"Sur devis"`).
- `badge`, `vendu`, `details`, `image` sont facultatifs.
- Les filtres de catégories se créent automatiquement à partir du champ `categorie`.

## Textes et couleurs

- Textes : directement dans `index.html` (sections Designer, Espace, Contact).
- Couleurs et polices : variables en haut de `css/style.css` (`:root`).
