# studio nogui — mise en ligne sur nogui.fr

Site statique (HTML/CSS/JS), servi par un conteneur Caddy sur le **VPS OVH**,
derrière le **proxy partagé `amui-proxy`** qui porte le domaine et le HTTPS.
Même mécanique qu'Oplaa, Wazazoo et RestoStock.

> ⚠️ Le Caddyfile qui tourne sur le VPS n'est **pas** celui du dépôt `amui-proxy`
> (restostock.fr y a été ajouté à la main). On ajoute donc le bloc nogui **à la
> main sur le VPS**, puis on le recopie dans le dépôt. **Ne jamais redéployer le
> proxy depuis le dépôt** tant que les deux ne sont pas réalignés.

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
| A | *(vide)* | IP du VPS |
| A | `www` | IP du VPS |

Supprimer les anciens A / CNAME / AAAA de ces deux entrées (page d'attente OVH).
L'IP du VPS est dans `DEPLOY_SSH_HOST` (secrets GitHub des autres projets) ou
dans l'espace client OVH → VPS.

## 3. Proxy (sur le VPS, en SSH, une fois)

1. Ouvrir le Caddyfile **réellement monté** par le proxy (vérifier avec
   `docker inspect` du conteneur caddy, volume `/etc/caddy/Caddyfile`).
2. Ajouter, sur le modèle des autres blocs :

   ```caddyfile
   nogui.fr {
   	encode zstd gzip
   	reverse_proxy nogui-app:80
   }

   www.nogui.fr {
   	redir https://nogui.fr{uri} permanent
   }
   ```

   (Si le Caddyfile du VPS utilise des variables `{$XXX_DOMAIN}`, ajouter
   `NOGUI_DOMAIN=nogui.fr` dans son `.env` et dans `environment:` du
   `compose.yaml` du proxy, et écrire `{$NOGUI_DOMAIN}` à la place de `nogui.fr`.)
3. Recharger : `cd <dossier du proxy> && docker compose up -d` (ou
   `docker exec <caddy> caddy reload --config /etc/caddy/Caddyfile`).
4. Recopier le même bloc dans le dépôt `amui-proxy` local (Caddyfile, `.env.dist`,
   `compose.yaml`) et commiter — **sans** lancer son workflow de déploiement.

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

Dépôt nogui → Settings → Secrets → Actions :
`DEPLOY_SSH_HOST`, `DEPLOY_SSH_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_SSH_PORT`
(défaut 22), `DEPLOY_PATH` (= le dossier du clone sur le VPS, étape 4).
Mêmes valeurs que pour Oplaa, sauf `DEPLOY_PATH`.

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
