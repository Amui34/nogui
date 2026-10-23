# studio nogui — mise en ligne sur nogui.fr

Site statique (HTML/CSS/JS), servi par un conteneur Caddy sur le **VPS OVH**,
derrière le **proxy partagé `amui-proxy`** qui porte le domaine et le HTTPS.
Même mécanique qu'Oplaa, Wazazoo et RestoStock.

> Le bloc nogui est **déjà dans le dépôt `amui-proxy`** (commit du 23/10, poussé).
> Sur le VPS, il suffit de faire `git pull` dans le clone du proxy, d'ajouter
> `NOGUI_DOMAIN=nogui.fr` dans son `.env`, puis `docker compose up -d`.
> Vérifier d'abord avec `git status` que le clone du VPS est propre (pas de
> modification locale non commitée) : sinon, reporter le bloc à la main.

---

## Comment ça tient ensemble

| Brique | Rôle | Où |
|---|---|---|
| **Conteneur `nogui`** | Caddy qui sert les fichiers du site en HTTP interne (port 80) | VPS, `compose.proxy.yaml`, alias réseau `nogui-app` |
| **Proxy `amui-proxy`** | Reçoit nogui.fr en 80/443, certificat Let's Encrypt, route vers `nogui-app:80` | VPS, Caddyfile du proxy |
| **GitHub Actions** | À chaque `push` sur `main` : SSH sur le VPS, `git reset --hard`, `docker compose up -d --build` | `.github/workflows/main.yaml` |
| **DNS OVH** | nogui.fr et www.nogui.fr pointent sur l'IP du VPS | Espace client OVH → Noms de domaine → Zone DNS |

Le site n'a aucune base de données : redéployer ne touche à rien d'autre.

---

## 1. Dépôt git (une fois)

```bash
cd "/Users/noamadar/Local Sites/nogui"
git init -b main
git add -A
git commit -m "Site vitrine studio nogui"
gh repo create nogui --private --source=. --push
```

## 2. DNS (espace client OVH, une fois)

Noms de domaine → **nogui.fr** → onglet **Zone DNS** :

| Type | Sous-domaine | Cible |
|---|---|---|
| A | *(vide)* | `51.178.87.46` |
| A | `www` | `51.178.87.46` |

`51.178.87.46` est l'IP du VPS (celle d'oplaa.pro, wazazoo.pro, restostock.fr).
Supprimer les anciens A / CNAME / AAAA de ces deux entrées : au 23/10, nogui.fr
pointe encore sur `213.186.33.5` (page d'attente OVH).

## 3. Proxy (sur le VPS, en SSH, une fois)

```bash
cd <dossier du clone amui-proxy>
git status            # doit être propre ; sinon ne pas tirer, reporter le bloc à la main
git pull
echo "NOGUI_DOMAIN=nogui.fr" >> .env
docker compose up -d  # recharge le proxy avec le bloc nogui.fr
```

Le bloc ajouté (déjà dans le Caddyfile du dépôt) :

```caddyfile
{$NOGUI_DOMAIN} {
	encode zstd gzip
	reverse_proxy nogui-app:80
}

www.{$NOGUI_DOMAIN} {
	redir https://{$NOGUI_DOMAIN}{uri} permanent
}
```

## 4. Conteneur nogui (sur le VPS, une fois)

```bash
cd /chemin/des/projets          # même dossier parent que oplaa, waza…
git clone git@github.com:<compte>/nogui.git
cd nogui
docker network create web 2>/dev/null || true
docker compose -f compose.proxy.yaml up -d --build
```

Puis ouvrir https://nogui.fr : le certificat est obtenu au premier accès
(quelques secondes), à condition que le DNS soit déjà propagé.

## 5. Déploiement automatique (GitHub, une fois)

Dépôt nogui → Settings → Secrets and variables → Actions.
Déjà renseignés le 23/10 : `DEPLOY_SSH_HOST` (`51.178.87.46`) et `DEPLOY_SSH_PORT` (`22`).
Restent à créer, mêmes valeurs que dans le dépôt Oplaa : `DEPLOY_SSH_USER`,
`DEPLOY_SSH_KEY` (la clé privée complète), et `DEPLOY_PATH` (= le dossier du
clone nogui sur le VPS, étape 4, par exemple `/root/nogui`).

Ensuite : modifier → commit → `git push` → en ligne en ~1 min. Le workflow
finit par un `curl` HTTPS sur nogui.fr et échoue si le site ne répond pas.

---

## Au quotidien

- **Ajouter un produit** : éditer `data/produits.json`, déposer la photo dans
  `assets/produits/`, commit, push.
- **Changer le CSS ou le JS** : incrémenter le `?v=` dans `index.html`
  (sinon les visiteurs gardent l'ancienne version en cache une semaine).
- **Tester le conteneur en local** : `docker compose up -d --build` →
  http://localhost:8093

## En cas de problème

| Ce que tu vois | Ce que ça veut dire |
|---|---|
| Page d'attente OVH sur nogui.fr | DNS pas encore propagé, ou ancien enregistrement non supprimé |
| Erreur de certificat | Le bloc `nogui.fr` manque dans le Caddyfile du VPS, ou DNS pas propagé au moment de la demande Let's Encrypt |
| 502 Bad Gateway | Le conteneur `nogui` ne tourne pas, ou n'est pas sur le réseau `web` avec l'alias `nogui-app` |
| Le site ne change pas après un push | Regarder l'onglet Actions : secrets manquants, ou `DEPLOY_PATH` faux |
