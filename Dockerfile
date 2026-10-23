# =============================================================================
# studio nogui — site statique servi par Caddy en HTTP interne (port 80).
# Le HTTPS et le domaine (nogui.fr) sont portés par le proxy partagé amui-proxy.
# =============================================================================
FROM caddy:2-alpine
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY index.html /srv/site/
COPY css   /srv/site/css
COPY js    /srv/site/js
COPY data  /srv/site/data
COPY assets /srv/site/assets
EXPOSE 80
