
const FEEDS = [
  "https://api.2performant.com/feed/678ad97ca.xml",
  "https://feeds.2performant.com/feed/9e5f87c47.xml"
];

const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 120;
const MAX_DESCRIPTION_LENGTH = 450;
const CACHE_TTL = 1000 * 60 * 30;

let cache = { products: null, categories: null, updatedAt: 0 };

function clean(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shorten(text, max = MAX_DESCRIPTION_LENGTH) {
  const value = clean(text);
  return value.length > max ? value.slice(0, max).trim() + "..." : value;
}

function normalize(text) {
  return String(text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function slugify(text, fallback) {
  return String(text || fallback)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || fallback;
}

function priceLei(price) {
  if (!price) return "Verifică oferta";
  const number = Number(String(price).replace(",", "."));
  return Number.isFinite(number) ? number.toFixed(2) + " lei" : price;
}

function readTag(item, names) {
  for (const name of names) {
    const regex = new RegExp("<" + name + "[^>]*>([\\s\\S]*?)<\\/" + name + ">", "i");
    const match = item.match(regex);
    if (match && match[1]) return clean(match[1]);
  }
  return "";
}

function splitItems(xml) {
  return xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<product[\s\S]*?<\/product>/gi) || [];
}

function allImages(value) {
  return clean(value).split(",").map(url => url.trim()).filter(Boolean);
}

function firstImage(value) {
  return allImages(value)[0] || "";
}

function hasWord(text, words) {
  return words.some(word => text.includes(word));
}

// Editează aici regulile pentru categorii.
function inferCategory(title, description) {
  const text = normalize(" " + title + " " + description + " ");

  if (hasWord(text, [" carte ", " carti ", " cărți ", " autor ", " editura ", " isbn "]) || /\bvol\.?\s*\d+/i.test(text)) {
    return "Cărți";
  }

  if (hasWord(text, [" pahar", " pahare", " farfur", " masa ", " masă ", " cana ", " cană ", " ceasca", " ceașcă", " tava ", " tacam", " tacâm", " set vesela"])) {
    return "Bucătărie & Dining";
  }

  if (hasWord(text, [" vaza", " vază", " bol ", " decor", " bomboniera", " ornament", " rama foto", " ramă foto", " sfesnic", " sfeșnic", " cristal"])) {
    return "Decor";
  }

  if (hasWord(text, [" lenjerie", " pat ", " perna", " pernă", " pilota"])) {
    return "Dormitor";
  }

  if (hasWord(text, [" lampa", " lampă", " iluminat", " veioza", " veioză"])) {
    return "Iluminat";
  }

  if (hasWord(text, [" scaun", " fotoliu", " masuta", " măsuță", " canapea"])) {
    return "Mobilier";
  }

  return "Produse";
}

function parseFeed(xml, feedIndex) {
  const items = splitItems(xml);

  return items.map((item, index) => {
    const title = readTag(item, ["title", "name", "product_name"]);
    const description = readTag(item, ["description", "short_description", "summary"]);
    const affiliateLink = readTag(item, ["aff_code", "affiliate_link", "tracking_url", "tracking_link", "link"]);
    const imageUrls = readTag(item, ["image_urls", "image_url", "image", "image_link", "picture"]);
    const campaignName = readTag(item, ["campaign_name", "brand", "merchant", "store"]);
    const rawCategory = readTag(item, ["category", "category_name", "product_category"]);
    const category = rawCategory || inferCategory(title, description);
    const images = allImages(imageUrls);

    return {
      id: slugify(title + "-" + campaignName + "-" + feedIndex + "-" + index, "feed-" + feedIndex + "-produs-" + (index + 1)),
      nume: title || "Produs " + (index + 1),
      categorie: category,
      pret: priceLei(readTag(item, ["price", "sale_price", "product_price"])),
      imagine: firstImage(imageUrls),
      imagini: images,
      descriere: shorten(description || "Produs recomandat de Art Home."),
      link: affiliateLink || "#",
      brand: campaignName || "2Performant",
      searchText: normalize(title + " " + description + " " + category + " " + campaignName)
    };
  }).filter(product => product.nume && product.link && product.link !== "#");
}

async function fetchFeed(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 ArtHomeAffiliateBot/1.0",
      "Accept": "application/xml,text/xml,text/plain,*/*"
    }
  });

  if (!response.ok) throw new Error("Feed status " + response.status);
  return response.text();
}

async function getAllProducts() {
  const now = Date.now();
  if (cache.products && now - cache.updatedAt < CACHE_TTL) return cache.products;

  let products = [];

  for (let i = 0; i < FEEDS.length; i++) {
    try {
      const xml = await fetchFeed(FEEDS[i]);
      products = products.concat(parseFeed(xml, i + 1));
    } catch (error) {
      console.log("Feed error:", FEEDS[i], error.message);
    }
  }

  const unique = [];
  const seen = new Set();

  for (const product of products) {
    const key = product.nume + "|" + product.brand;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(product);
    }
  }

  cache.products = unique;
  cache.categories = ["Toate", ...new Set(unique.map(p => p.categorie || "Produse"))].sort();
  cache.updatedAt = now;

  return unique;
}

function publicProduct(product) {
  const { searchText, ...rest } = product;
  return rest;
}

exports.handler = async function (event) {
  try {
    const params = event.queryStringParameters || {};
    const mode = params.mode || "products";
    const page = Math.max(Number(params.page || 1), 1);
    const requestedLimit = Number(params.limit || DEFAULT_LIMIT);
    const limit = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);
    const search = normalize(params.search || "");
    const category = params.category || "Toate";
    const id = params.id || "";

    const allProducts = await getAllProducts();

    if (mode === "categories") {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=900" },
        body: JSON.stringify({ categories: cache.categories || ["Toate"], totalProducts: allProducts.length, updatedAt: new Date(cache.updatedAt).toISOString() })
      };
    }

    if (mode === "product") {
      const product = allProducts.find(p => p.id === id);
      if (!product) {
        return {
          statusCode: 404,
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ error: "Produsul nu a fost găsit.", id, totalAvailable: allProducts.length })
        };
      }

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=900" },
        body: JSON.stringify({ product: publicProduct(product) })
      };
    }

    let filtered = allProducts;
    if (category && category !== "Toate") filtered = filtered.filter(p => p.categorie === category);
    if (search) filtered = filtered.filter(p => p.searchText.includes(search));

    const total = filtered.length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const start = (page - 1) * limit;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=900" },
      body: JSON.stringify({
        products: filtered.slice(start, start + limit).map(publicProduct),
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
        category,
        search: params.search || "",
        totalAvailable: allProducts.length,
        updatedAt: new Date(cache.updatedAt).toISOString()
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ error: error.message })
    };
  }
};
