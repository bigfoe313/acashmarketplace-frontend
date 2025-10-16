// script.js — full, DOM-ready, Render-compatible, image proxy added
document.addEventListener("DOMContentLoaded", () => {
  // ---------------------------
  // Base API URL
  // ---------------------------
  const API_BASE = "https://acashmarketplace-backend.onrender.com"; // 🔥 Replace with your Render URL

  // ---------------------------
  // Element references
  // ---------------------------
  const categoryIcon = document.getElementById("categoryIcon");
  const categoryDropdown = document.getElementById("categoryDropdown");
  const searchInput = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearBtn");
  const searchBtn = document.getElementById("searchBtn");
  const resultsContainer = document.getElementById("resultsContainer");

  if (!searchInput) console.warn("Warning: #searchInput not found in DOM");
  if (!categoryIcon) console.warn("Warning: #categoryIcon not found in DOM");
  if (!categoryDropdown) console.warn("Warning: #categoryDropdown not found in DOM");

  // ---------------------------
  // Proxy helper for images
  // ---------------------------
  function proxyImage(url) {
    if (!url) return "https://via.placeholder.com/150";
    return `${API_BASE}/api/image-proxy?url=${encodeURIComponent(url)}`;
  }

  // ---------------------------
  // Category tree & dropdown
  // ---------------------------
  const categoryTree = [
    { name: "Consumer Electronics", children: ["Mobile Phone","Earphones & Headphones","Smart Watch","Tablets"] },
    { name: "Computer & Office", children: ["Laptop Computer","Computer Keyboards","Computer Mouse","Computer Storage Devices"] },
    { name: "Home & Garden", children: ["Kitchen Tools","Home Decor","Lighting","Storage & Organization"] },
    { name: "Beauty & Health", children: ["Skin Care","Women's Makeup","Hair Care Products","Health Monitoring Devices"] },
    { name: "Sports & Entertainment", children: ["Cycling","Camping & Hiking","Fitness Equipment","Musical Instruments"] },
    { name: "Toys & Hobbies", children: ["Action Figures","Building Blocks","RC Toys","Educational Toys"] },
    { name: "Automobiles & Motorcycles", children: ["Car Electronics","Interior Accessories","Motorcycle Parts"] },
    { name: "Jewelry & Accessories", children: ["Necklaces","Bracelets","Rings","Watches"] },
    { name: "Bags & Luggage", children: ["Backpacks","Handbags","Suitcases","Wallets"] }
  ];

  function buildCategoryDropdown() {
    if (!categoryDropdown) return;
    categoryDropdown.innerHTML = "";
    categoryTree.forEach(cat => {
      const catItem = document.createElement("div");
      catItem.className = "category-item";
      catItem.textContent = cat.name;

      const subList = document.createElement("div");
      subList.className = "subcategory-list";

      cat.children.forEach(sub => {
        const subItem = document.createElement("div");
        subItem.className = "subcategory-item";
        subItem.textContent = sub;
        subItem.dataset.full = `${cat.name} > ${sub}`;
        subList.appendChild(subItem);
      });

      catItem.addEventListener("click", () => {
        const currentlyVisible = subList.style.display === "block";
        categoryDropdown.querySelectorAll(".subcategory-list").forEach(el => el.style.display = "none");
        subList.style.display = currentlyVisible ? "none" : "block";
      });

      categoryDropdown.appendChild(catItem);
      categoryDropdown.appendChild(subList);
    });
  }

  function toggleDropdown() {
    if (!categoryDropdown) return;
    const show = categoryDropdown.style.display !== "block";
    if (show) {
      buildCategoryDropdown();
      categoryDropdown.style.display = "block";
    } else {
      categoryDropdown.style.display = "none";
    }
  }

  if (categoryIcon) {
    categoryIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown();
    });
  }

  document.addEventListener("click", (e) => {
    if (!categoryDropdown) return;
    if (!categoryDropdown.contains(e.target) && !categoryIcon.contains(e.target)) {
      categoryDropdown.style.display = "none";
    }
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearBtn && (clearBtn.style.display = searchInput.value.trim() ? "inline" : "none");
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (!searchInput) return;
      searchInput.value = "";
      clearBtn.style.display = "none";
      searchInput.focus();
    });
  }

  if (categoryDropdown) {
    categoryDropdown.addEventListener("click", (event) => {
      const item = event.target.closest(".category-item, .subcategory-item");
      if (!item) return;
      const text = item.textContent.trim();
      if (searchInput) {
        searchInput.value = text;
        clearBtn && (clearBtn.style.display = "inline");
      }
      categoryDropdown.style.display = "none";
    });
  }

  // ---------------------------
  // Fetch Products
  // ---------------------------
  async function fetchProducts() {
    if (!searchInput) return alert("Search input is missing.");
    const query = searchInput.value.trim();
    if (!query) return alert("Please enter a search term.");

    resultsContainer && (resultsContainer.innerHTML = '<p class="spinner"></p>');

    try {
      const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      if (!data.results || data.results.length === 0) {
        resultsContainer.innerHTML = "<p>No products found.</p>";
        return;
      }
      renderProducts(data.results);
    } catch (err) {
      console.error("Error fetching products:", err);
      alert("Failed to fetch products. Check console.");
    }
  }

  if (searchBtn) searchBtn.addEventListener("click", fetchProducts);
  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") fetchProducts();
    });
  }

  // ---------------------------
  // Render Products
  // ---------------------------
async function renderProducts(products) {
    if (!resultsContainer) return;

    const filteredProducts = products.filter(p => {
      const min = p.min_delivery_days;
      const max = p.max_delivery_days;
      return (min && min !== "N/A") || (max && max !== "N/A");
    });

    resultsContainer.innerHTML = "";

    if (filteredProducts.length === 0) {
      resultsContainer.innerHTML = "<p>No products with valid delivery info found.</p>";
      return;
    }

    async function getMetaMaskCartData(product) {
      const response = await fetch(`${API_BASE}/api/metamask-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: product.title,
          price: product.price,
          shipping_fee: product.shipping_fee,
          image: product.image,
          productId: product.id,
          skuId: product.sku_id,
        }),
      });
      const data = await response.json();
      return data.cart;
    }

    function buildMetaMaskUrl(cart, delivery) {
      return (
        `https://metamask.app.link/dapp/bigfoe313.github.io/shoppingcart/?` +
        `_autoresponse=${encodeURIComponent(
          `Thank you for shopping with us. Your order (${cart.price.toFixed(
            2
          )} A-CASH plus ${cart.shipping.toFixed(
            2
          )} A-CASH shipping cost) has been received and will be processed shortly.`
        )}` +
        `&_subject=${encodeURIComponent(
          `A-CASH Marketplace order confirmation (${cart.title}) - transactionHash`
        )}` +
        `&cartTitle=${encodeURIComponent(cart.title)}` +
        `&cartProductId=${encodeURIComponent(cart.productId)}` +
        `&cartColor=${encodeURIComponent(cart.color || "Default")}` +
        `&cartImage=${cart.image}` +
        `&span1=${encodeURIComponent(`${cart.discountTotal} A-CASH`)}` +
        `&span2=${encodeURIComponent(`${cart.shipping.toFixed(2)} A-CASH`)}` +
        `&span3=${encodeURIComponent(delivery)}` +
        `&span4=${encodeURIComponent(`${cart.total.toFixed(2)} A-CASH`)}` +
        `&total=${encodeURIComponent(`${cart.total.toFixed(2)}`)}`
      );
    }

    filteredProducts.forEach(product => {
      const card = document.createElement("div");
      card.className = "product-card";

      const title = product.title || "No title";
      const price = parseFloat(product.price || "0");
      const shippingFee = product.shipping_fee && product.shipping_fee !== "N/A" ? parseFloat(product.shipping_fee) : 0;
      const total = (price + shippingFee).toFixed(2);
      const image = proxyImage(product.skuImage); // ✅ prefer skuImage if available

      const min = product.min_delivery_days;
      const max = product.max_delivery_days;
      let delivery;
      if (min && max && min !== "N/A" && max !== "N/A") delivery = `${min}-${max} Days`;
      else if (min && min !== "N/A") delivery = `${min} Days`;
      else if (max && max !== "N/A") delivery = `${max} Days`;
      else delivery = "N/A";

      const discountPrice = (price * 0.9).toFixed(2);

      card.innerHTML = `
        <img src="${image}" alt="${title}" class="clickable" />
        <h3 class="clickable">${title}</h3>
        <div class="price-info">
          <p>Price: <strong>$${price.toFixed(2)}</strong></p>
          <p>Shipping: <strong>$${shippingFee.toFixed(2)}</strong></p>
          <p>Total: <strong>$${total}</strong></p>
        </div>
        <p>Delivery: ${delivery}</p>
        <button class="buy-now-btn"
          data-id="${product.id}"
          data-title="${title}"
          data-price="${price}"
          data-shipping="${shippingFee}"
          data-image="${image}"
          data-skuid="${product.sku_id}"
        >Buy Now</button>

        <div class="or-divider">
          <div></div><span>OR</span><div></div>
        </div>

        <a href="#" class="metamask-btn">
          <div class="mm-text">
            <span class="mm-line1">Buy with 10% Discount</span>
            <div class="mm-price-row">
              <span class="mm-line2"><strong>${discountPrice} A-CASH</strong></span>
              <img class="metamask-logo"
                   src="https://1drv.ms/i/c/1be873ae44c8b2ba/IQQV7auH9LBKSbJ4vuX7x-pFAbJAdhf6tVOeWiFc6XvMiYs?width=1024"
                   alt="Metamask">
            </div>
          </div>
        </a>
      `;

      resultsContainer.appendChild(card);

      // --- Hover styles ---
      const style = document.createElement("style");
      style.textContent = `
        .product-card img.clickable, .product-card h3.clickable {
          cursor: pointer;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }
        .product-card img.clickable:hover {
          transform: scale(1.03);
          opacity: 0.9;
        }
        .product-card h3.clickable:hover {
          color: #0070f3;
        }
      `;
      document.head.appendChild(style);

      // --- Stripe Checkout ---
      const handleCheckout = async () => {
        try {
          const response = await fetch(`${API_BASE}/api/cart/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              price,
              shipping_fee: shippingFee,
              image,
              productId: product.id,
              skuId: product.sku_id,
            }),
          });

          const data = await response.json();
          if (data.url) window.open(data.url, "_blank");
          else alert("Failed to start checkout session.");
        } catch (err) {
          console.error("Stripe Checkout Error:", err);
        }
      };

      card.querySelector(".buy-now-btn").addEventListener("click", handleCheckout);
      card.querySelector("img").addEventListener("click", handleCheckout);
      card.querySelector("h3").addEventListener("click", handleCheckout);

      // ---------------------------
      // MetaMask Checkout
      // ---------------------------
      const metamaskBtn = card.querySelector(".metamask-btn");
      metamaskBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          const cartData = await getMetaMaskCartData(product); // your existing function

          if (!cartData) {
            alert("Failed to create MetaMask cart");
            return;
          }

          // Wrap the image URL through your backend proxy
          const proxiedImage = `${API_BASE}/api/image-proxy?url=${encodeURIComponent(cartData.image)}`;

          // Build the cart object for MetaMask checkout
          const cart = {
            ...cartData,
            image: proxiedImage, // ⚡ Important: use proxied URL
            color: cartData.color || "Default",
            total: cartData.total,
            discountTotal: cartData.discountTotal,
            price: cartData.price,
            shipping: cartData.shipping,
            title: cartData.title,
            productId: cartData.productId,
          };

          // Construct MetaMask URL
          const mmUrl = buildMetaMaskUrl(cart, product.min_delivery_days && product.max_delivery_days
            ? `${product.min_delivery_days}-${product.max_delivery_days} Days`
            : (product.min_delivery_days || product.max_delivery_days || "N/A")
          );

          window.open(mmUrl, "_blank");

        } catch (err) {
          console.error("MetaMask Checkout Error:", err);
          alert("MetaMask checkout failed.");
        }
      });
    });
};

  window.fetchProducts = fetchProducts;

async function initCarousel() {
  const carouselContainer = document.getElementById("carouselContainer");
  const carouselItem = document.getElementById("carouselItem");
  if (!carouselContainer || !carouselItem) return;

  const searchTerms = [
    "Smart Glasses",
    "Smart Watch",
    "Laptop Computer",
    "Earphones & Headphones",
    "Mobile Phone"
  ];

  let featuredProducts = [];
  const CACHE_KEY = "featuredProductsCache";
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  const proxyImage = (url) => `${API_BASE}/api/image-proxy?url=${encodeURIComponent(url)}`;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL) {
        featuredProducts = parsed.data;
      }
    }

    if (featuredProducts.length === 0) {
      const responses = await Promise.all(
        searchTerms.map(term =>
          fetch(`${API_BASE}/api/search?q=${encodeURIComponent(term)}`)
            .then(res => (res && res.ok ? res.json() : null))
            .catch(() => null)
        )
      );

      // pick one product per search term
      for (const data of responses) {
        if (!data || !Array.isArray(data.results) || data.results.length === 0) continue;
        const candidates = data.results.filter(item => {
          const min = item?.min_delivery_days;
          const max = item?.max_delivery_days;
          return (min && min !== "N/A") || (max && max !== "N/A");
        });
        if (candidates.length === 0) continue;
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        featuredProducts.push(pick);
      }

      if (featuredProducts.length > 0) {
        // Enrich each featured product with SKU details upfront
        featuredProducts = await Promise.all(
          featuredProducts.map(async (product) => {
            try {
              const skuDetails = await fetch(`${API_BASE}/api/sku-details`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: product.id, skuId: product.sku_id })
              }).then(res => res.json());
              return {
                ...product,
                color: skuDetails.color || "",
                skuImage: skuDetails.skuImage || product.image
              };
            } catch {
              return { ...product, color: "", skuImage: product.image };
            }
          })
        );

        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ timestamp: Date.now(), data: featuredProducts })
        );
      }
    }

    if (featuredProducts.length === 0) {
      carouselItem.innerHTML = "<p>No featured products found.</p>";
      return;
    }

    let currentIndex = 0;
    let carouselInterval = null;
    let isPaused = false;

    const controlsWrapper = document.createElement("div");
    controlsWrapper.className = "carousel-controls";
    controlsWrapper.style.position = "absolute";
    controlsWrapper.style.top = "50%";
    controlsWrapper.style.left = "0";
    controlsWrapper.style.right = "0";
    controlsWrapper.style.display = "flex";
    controlsWrapper.style.justifyContent = "space-between";
    controlsWrapper.style.alignItems = "center";
    controlsWrapper.style.pointerEvents = "none";

    controlsWrapper.innerHTML = `
      <button id="prev-btn" style="pointer-events:auto;background:rgba(0,0,0,0.45);color:white;border:none;border-radius:20px;padding:6px 8px;cursor:pointer;">◀</button>
      <button id="pause-btn" style="pointer-events:auto;background:rgba(0,0,0,0.45);color:white;border:none;border-radius:20px;padding:6px 10px;cursor:pointer;">❚❚</button>
      <button id="next-btn" style="pointer-events:auto;background:rgba(0,0,0,0.45);color:white;border:none;border-radius:20px;padding:6px 8px;cursor:pointer;">▶</button>
    `;
    carouselContainer.style.position = "relative";
    carouselContainer.appendChild(controlsWrapper);

    function renderProduct(index) {
      const product = featuredProducts[index];
      if (!product) return;

      const qp = new URLSearchParams({
        id: product.id ?? "",
        title: product.title ?? "",
        price: product.price ?? "0",
        shipping: product.shipping_fee ?? "0",
        image: proxyImage(product.skuImage || product.image || ""),
        skuId: product.sku_id ?? "",
        minDelivery: product.min_delivery_days ?? "",
        maxDelivery: product.max_delivery_days ?? "",
        color: product.color ?? ""
      }).toString();

      const productUrl = `product.html?${qp}`;
      const deliveryText = (product.min_delivery_days && product.max_delivery_days)
        ? `${product.min_delivery_days}-${product.max_delivery_days} Days`
        : (product.min_delivery_days || product.max_delivery_days || "N/A");

      carouselItem.style.transition = "opacity 0.4s ease";
      carouselItem.style.opacity = 0;

        setTimeout(() => {
          carouselItem.innerHTML = `
            <div class="carousel-card" style="text-align:center;">
              <a href="${productUrl}" style="color:inherit;text-decoration:none;">
                <img src="${proxyImage(product.skuImage || 'https://via.placeholder.com/150')}"
                     alt="${product.title || ''}"
                     style="max-width:100%;border-radius:6px;" />
                <h3 style="margin:8px 0 4px;">${product.title || ""}</h3>
                <p style="margin:0 0 6px;"><strong>$${parseFloat(product.price || 0).toFixed(2)}</strong></p>
                <p style="margin:0 6px 8px;color:#444;font-size:0.9rem;">Delivery: ${deliveryText}</p>
              </a>
            </div>
          `;
          carouselItem.style.opacity = 1;
        }, 400);
    }

    function showPrev() {
      currentIndex = (currentIndex - 1 + featuredProducts.length) % featuredProducts.length;
      renderProduct(currentIndex);
    }
    function showNext() {
      currentIndex = (currentIndex + 1) % featuredProducts.length;
      renderProduct(currentIndex);
    }
    function togglePause() {
      isPaused = !isPaused;
      document.getElementById("pause-btn").textContent = isPaused ? "▶" : "❚❚";
      if (isPaused) clearInterval(carouselInterval);
      else startCarousel();
    }

    function startCarousel() {
      clearInterval(carouselInterval);
      carouselInterval = setInterval(() => {
        if (!isPaused) {
          // Advance index
          currentIndex = (currentIndex + 1) % featuredProducts.length;

          // Render current product
          renderProduct(currentIndex);

          // If we've wrapped back to first product, stop carousel
          if (currentIndex === 0) {
            clearInterval(carouselInterval);
            carouselInterval = null;
          }
        }
      }, 5000); // adjust interval as needed
    }

    controlsWrapper.querySelector("#prev-btn").onclick = showPrev;
    controlsWrapper.querySelector("#next-btn").onclick = showNext;
    controlsWrapper.querySelector("#pause-btn").onclick = togglePause;

    renderProduct(currentIndex);
    startCarousel();

  } catch (err) {
    console.error("Carousel error:", err);
    carouselItem.innerHTML = "<p>Failed to load featured products.</p>";
  }
}

  initCarousel();

});
