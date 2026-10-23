/* ==========================================================
   Nogui — scripts
   - menu mobile
   - chargement des produits depuis data/produits.json
   - filtres par catégorie
   - fiche produit (modal)
   ========================================================== */

(function () {
  "use strict";

  /* ---------- Année du footer ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Menu mobile ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Produits ---------- */
  var grid = document.getElementById("products");
  var filters = document.getElementById("filters");
  if (!grid) return;

  var produits = [];
  var currentFilter = "Tous";

  function formatPrice(p) {
    if (p === null || p === undefined || p === "") return "";
    if (typeof p === "string") return p;
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(p);
  }

  function initials(name) {
    return name.split(/\s+/).slice(0, 2).map(function (w) { return w[0] || ""; }).join("").toUpperCase();
  }

  function mediaEl(p, className) {
    var box = document.createElement("div");
    box.className = className;
    if (p.image) {
      var img = document.createElement("img");
      img.src = p.image;
      img.alt = p.nom;
      img.loading = "lazy";
      img.onerror = function () {
        box.classList.add("is-placeholder");
        box.textContent = initials(p.nom);
      };
      box.appendChild(img);
    } else {
      box.classList.add("is-placeholder");
      box.textContent = initials(p.nom);
    }
    return box;
  }

  function render() {
    grid.innerHTML = "";
    var list = produits.filter(function (p) {
      return currentFilter === "Tous" || p.categorie === currentFilter;
    });

    if (!list.length) {
      var empty = document.createElement("p");
      empty.className = "products__empty";
      empty.textContent = "Aucun produit pour le moment.";
      grid.appendChild(empty);
      return;
    }

    list.forEach(function (p, i) {
      var card = document.createElement("button");
      card.className = "product";
      card.type = "button";
      card.setAttribute("aria-label", "Voir " + p.nom);

      var media = mediaEl(p, "product__media");
      if (p.badge) {
        var badge = document.createElement("span");
        badge.className = "product__badge";
        badge.textContent = p.badge;
        media.appendChild(badge);
      }

      var cat = document.createElement("span");
      cat.className = "product__cat";
      cat.textContent = p.categorie || "";

      var name = document.createElement("h3");
      name.className = "product__name";
      name.textContent = p.nom;

      var price = document.createElement("span");
      price.className = "product__price" + (p.vendu ? " product__price--sold" : "");
      price.textContent = p.vendu ? "Vendu" : formatPrice(p.prix);

      card.append(media, cat, name, price);
      card.addEventListener("click", function () { openModal(p); });
      grid.appendChild(card);
    });
  }

  function renderFilters() {
    if (!filters) return;
    var cats = ["Tous"].concat(
      produits.map(function (p) { return p.categorie; })
        .filter(function (c, i, a) { return c && a.indexOf(c) === i; })
    );
    if (cats.length <= 2) { filters.hidden = true; return; }
    filters.innerHTML = "";
    cats.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(c === currentFilter));
      b.textContent = c;
      b.addEventListener("click", function () {
        currentFilter = c;
        filters.querySelectorAll("button").forEach(function (x) {
          x.setAttribute("aria-selected", String(x === b));
        });
        render();
      });
      filters.appendChild(b);
    });
  }

  /* ---------- Modal ---------- */
  var modal = document.getElementById("modal");
  var lastFocus = null;

  function openModal(p) {
    if (!modal) return;
    lastFocus = document.activeElement;

    var media = document.getElementById("modal-media");
    media.replaceWith(mediaEl(p, "modal__media"));
    document.querySelector(".modal__media").id = "modal-media";

    document.getElementById("modal-cat").textContent = p.categorie || "";
    document.getElementById("modal-title").textContent = p.nom;
    document.getElementById("modal-price").textContent = p.vendu ? "Vendu" : formatPrice(p.prix);
    document.getElementById("modal-desc").textContent = p.description || "";

    var specs = document.getElementById("modal-specs");
    specs.innerHTML = "";
    var s = p.details || {};
    Object.keys(s).forEach(function (k) {
      var dt = document.createElement("dt"); dt.textContent = k;
      var dd = document.createElement("dd"); dd.textContent = s[k];
      specs.append(dt, dd);
    });

    var cta = document.getElementById("modal-cta");
    cta.href = "mailto:bonjour@nogui.fr?subject=" + encodeURIComponent("Demande : " + p.nom);
    cta.textContent = p.vendu ? "Demander une pièce similaire" : "Demander ce produit";

    modal.hidden = false;
    document.body.classList.add("modal-open");
    modal.querySelector(".modal__close").focus();
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    if (lastFocus) lastFocus.focus();
  }

  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });
  }

  /* ---------- Chargement ---------- */
  fetch("data/produits.json", { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      produits = Array.isArray(data) ? data : (data.produits || []);
      renderFilters();
      render();
    })
    .catch(function (err) {
      grid.innerHTML = "";
      var p = document.createElement("p");
      p.className = "products__empty";
      p.textContent = "Impossible de charger les produits (" + err.message + "). " +
        "Vérifiez data/produits.json et ouvrez le site via un serveur local.";
      grid.appendChild(p);
    });
})();
