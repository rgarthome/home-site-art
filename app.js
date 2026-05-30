
let currentPage = 1;
let currentSearch = "";
let currentCategory = "Toate";
let isLoading = false;
let hasMore = true;

const LIMIT = 60;
const API_PRODUCTS = "/.netlify/functions/products";

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderProductImage(product) {
  const images = [];

  if (product.imagine) images.push(product.imagine);
  if (Array.isArray(product.imagini)) images.push(...product.imagini);

  const uniqueImages = [...new Set(images.filter(Boolean))];

  if (!uniqueImages.length) return "🏡";

  const firstImage = escapeHtml(uniqueImages[0]);

  return `
    <img
      src="${firstImage}"
      alt="${escapeHtml(product.nume)}"
      loading="lazy"
      referrerpolicy="no-referrer"
      onerror="this.style.display='none'; this.parentElement.innerHTML='🏡';"
    >
  `;
}

// Card produs fără descriere.
function renderProductCard(product) {
  return `
    <article class="card">
      <div class="card-img">
        ${renderProductImage(product)}
      </div>

      <div class="card-content">
        <h3>${escapeHtml(product.nume)}</h3>

        <div class="price">
          ${escapeHtml(product.pret || "Verifică oferta")}
        </div>

        <div class="meta">
          Magazin: ${escapeHtml(product.brand || "2Performant")}
        </div>

        <div class="card-actions">
          <a
            class="btn btn-secondary"
            href="product.html?id=${encodeURIComponent(product.id)}">
            Vezi detalii
          </a>

          <a
            class="btn btn-primary"
            href="${escapeHtml(product.link)}"
            target="_blank"
            rel="nofollow sponsored noopener">
            Vezi oferta
          </a>
        </div>
      </div>
    </article>
  `;
}

async function loadCategories() {
  const response = await fetch(`${API_PRODUCTS}?mode=categories`);
  const data = await response.json();

  const select = document.getElementById("categorySelect");

  if (!select) return;

  select.innerHTML = data.categories
    .map(category => `
      <option value="${escapeHtml(category)}">
        ${escapeHtml(category)}
      </option>
    `)
    .join("");
}

async function loadProducts(reset = false) {
  if (isLoading) return;

  isLoading = true;

  if (reset) {
    currentPage = 1;
    hasMore = true;
    document.getElementById("productsGrid").innerHTML = "";
  }

  const status = document.getElementById("feedStatus");
  const button = document.getElementById("loadMoreButton");

  if (button) button.textContent = "Se încarcă...";
  if (status) status.textContent = "Se încarcă produsele...";

  const url = new URL(API_PRODUCTS, location.origin);

  url.searchParams.set("page", currentPage);
  url.searchParams.set("limit", LIMIT);
  url.searchParams.set("category", currentCategory);

  if (currentSearch) {
    url.searchParams.set("search", currentSearch);
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    const grid = document.getElementById("productsGrid");

    if (reset && (!data.products || !data.products.length)) {
      grid.innerHTML = `<div class="empty">Nu am găsit produse.</div>`;
    } else {
      grid.insertAdjacentHTML(
        "beforeend",
        data.products.map(renderProductCard).join("")
      );
    }

    hasMore = data.hasMore;
    currentPage += 1;

    if (status) {
      status.textContent =
        `Afișate ${grid.querySelectorAll(".card").length} din ${data.total} produse filtrate. Total feed: ${data.totalAvailable}.`;
    }

    if (button) {
      button.style.display = hasMore ? "inline-block" : "none";
      button.textContent = "Încarcă mai multe produse";
    }
  } catch (error) {
    if (status) {
      status.textContent = "Eroare la încărcarea produselor: " + error.message;
    }

    if (button) {
      button.textContent = "Încearcă din nou";
    }
  }

  isLoading = false;
}

function applyFilters() {
  currentSearch = document.getElementById("productSearch")?.value.trim() || "";
  currentCategory = document.getElementById("categorySelect")?.value || "Toate";

  loadProducts(true);

  document.getElementById("produse")?.scrollIntoView({ behavior: "smooth" });
}

async function loadProductPage() {
  const id = new URLSearchParams(location.search).get("id");
  const status = document.getElementById("feedStatus");

  try {
    const response = await fetch(`${API_PRODUCTS}?mode=product&id=${encodeURIComponent(id)}`);
    const data = await response.json();

    if (!response.ok || !data.product) {
      throw new Error(data.error || "Produs negăsit");
    }

    const product = data.product;

    document.title = `${product.nume} | Art Home`;

    document.getElementById("productCategory").textContent = product.categorie || "Produse";
    document.getElementById("productBreadcrumbName").textContent = product.nume;
    document.getElementById("productTitle").textContent = product.nume;
    document.getElementById("productDescription").textContent = product.descriere || "";
    document.getElementById("productPrice").textContent = product.pret || "Verifică oferta";
    document.getElementById("productBrand").textContent = product.brand ? `Magazin: ${product.brand}` : "";
    document.getElementById("productImage").innerHTML = renderProductImage(product);
    document.getElementById("affiliateButton").href = product.link || "#";

    document.getElementById("productBenefits").innerHTML = `
      <li>Produs importat automat din feed 2Performant.</li>
      <li>Imaginea este preluată din image_urls.</li>
      <li>Butonul duce către magazinul partener.</li>
    `;

    if (status) status.textContent = "Produs încărcat corect.";
  } catch (error) {
    if (status) status.textContent = "Eroare: " + error.message;
  }
}

function toggleChat() {
  const chat = document.getElementById("chatWidget");
  if (!chat) return;
  chat.classList.toggle("open");
}

function addMessage(text, type) {
  const messages = document.getElementById("chatMessages");
  if (!messages) return;

  const div = document.createElement("div");
  div.className = "message " + type;
  div.innerHTML = text;

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function sendMessage(event) {
  event.preventDefault();

  const input = document.getElementById("chatInput");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  addMessage(escapeHtml(text), "user");
  input.value = "";

  setTimeout(() => {
    const question = text.toLowerCase();

    let reply = "Poți căuta produse folosind bara de căutare și meniul de categorii.";

    if (question.includes("afiliere")) {
      reply = "Linkurile sunt preluate din feed-urile 2Performant și duc către magazinele partenere.";
    }

    if (question.includes("categorie")) {
      reply = "Alege o categorie din meniul de categorii, apoi apasă Caută.";
    }

    addMessage(reply, "bot");
  }, 400);
}

document.addEventListener("DOMContentLoaded", async () => {
  if (document.getElementById("productsGrid")) {
    await loadCategories();
    await loadProducts(true);

    document.getElementById("productSearch").addEventListener("keyup", event => {
      if (event.key === "Enter") applyFilters();
    });

    document.getElementById("categorySelect").addEventListener("change", applyFilters);
  }

  if (document.getElementById("productTitle")) {
    loadProductPage();
  }
});
