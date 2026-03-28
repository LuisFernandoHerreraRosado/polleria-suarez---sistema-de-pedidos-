/* app.js - Pollos a la Brasa Suárez (sin BD)
   - Usuarios: localStorage (pas_users)
   - Sesión:   localStorage (pas_auth)
   - Pedidos:  localStorage (pas_orders)
   - Pedido actual (cliente): sessionStorage (pas_current_order)
*/

(() => {
  // Claves para el almacenamiento local y de sesión
  const KEYS = {
    USERS: "pas_users",
    AUTH: "pas_auth",
    ORDERS: "pas_orders",
    CURRENT_ORDER: "pas_current_order",
    CART_DRAFT: "pas_cart_draft",
  };

  // Selector abreviado para elementos del DOM
  const $ = (sel) => document.querySelector(sel);

  // Precios base de los productos
  const PRICES = {
    pollo: { "1_4": 20, "1_2": 40, 1: 75 },
    mostrito: { "1_4": 25, "1_2": 45, 1: 85 },
    gaseosa: { "0.5L": 5, "1L": 8, "1.5L": 12, "2.25L": 15 },
  };

  // Intenta parsear un JSON, si falla devuelve un valor por defecto
  function safeParse(json, fallback) {
    try {
      return JSON.parse(json) ?? fallback;
    } catch {
      return fallback;
    }
  }

  // Obtiene la lista de usuarios desde localStorage
  function getUsers() {
    return safeParse(localStorage.getItem(KEYS.USERS), []);
  }
  // Guarda la lista de usuarios en localStorage
  function saveUsers(users) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  }

  // Obtiene los datos de la sesión actual
  function getAuth() {
    return safeParse(localStorage.getItem(KEYS.AUTH), null);
  }
  // Establece los datos de la sesión actual
  function setAuth(user) {
    localStorage.setItem(KEYS.AUTH, JSON.stringify(user));
  }
  // Elimina los datos de la sesión (Cerrar sesión)
  function clearAuth() {
    localStorage.removeItem(KEYS.AUTH);
  }

  // Obtiene la lista de pedidos realizados
  function getOrders() {
    return safeParse(localStorage.getItem(KEYS.ORDERS), []);
  }
  // Guarda la lista de pedidos en localStorage
  function saveOrders(orders) {
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  }

  // Obtiene el pedido que se está armando actualmente
  function getCurrentOrder() {
    return safeParse(sessionStorage.getItem(KEYS.CURRENT_ORDER), null);
  }
  // Guarda el pedido actual en sessionStorage
  function setCurrentOrder(order) {
    sessionStorage.setItem(KEYS.CURRENT_ORDER, JSON.stringify(order));
  }
  // Elimina el pedido actual
  function clearCurrentOrder() {
    sessionStorage.removeItem(KEYS.CURRENT_ORDER);
  }

  // Obtiene el borrador del carrito desde localStorage
  function getCartDraft() {
    return safeParse(localStorage.getItem(KEYS.CART_DRAFT), []);
  }
  // Guarda el borrador del carrito en localStorage
  function saveCartDraft(cartEntries) {
    localStorage.setItem(KEYS.CART_DRAFT, JSON.stringify(cartEntries));
  }

  // Actualiza el contador de items en el icono del carrito en la barra de navegación
  function updateCartNavUI() {
    const entries = getCartDraft();
    const count = entries.reduce(
      (acc, [key, item]) => acc + (item.qty || 0),
      0,
    );
    const cartCountEl = document.getElementById("cartCount");
    if (cartCountEl) {
      cartCountEl.textContent = count;
    }
  }

  // Muestra un resumen del carrito en una ventana de alerta
  function showCartSummary() {
    const entries = getCartDraft();
    if (entries.length === 0) {
      alert("El carrito está vacío.");
      return;
    }

    let mensaje = "Tu carrito:\n\n";
    let total = 0;

    entries.forEach(([key, item], index) => {
      let detail = "";
      let price = 0;
      const portionLabel = (p) =>
        p === "1_4" ? "1/4" : p === "1_2" ? "1/2" : "1";

      if (item.type === "pollo") {
        detail = `Pollo (${portionLabel(item.portion)})`;
        price = PRICES.pollo[item.portion] * item.qty;
      } else if (item.type === "mostrito") {
        detail = `Mostrito (${portionLabel(item.portion)})`;
        price = PRICES.mostrito[item.portion] * item.qty;
      } else if (item.type === "gaseosa") {
        detail = `Gaseosa ${item.brand} (${item.size})`;
        price = PRICES.gaseosa[item.size] * item.qty;
      }

      mensaje += `${index + 1}. ${detail} - Cantidad: ${item.qty} - S/ ${price.toFixed(2)}\n`;
      total += price;
    });

    mensaje += `\nTotal: S/ ${total.toFixed(2)}`;
    alert(mensaje);
  }

  // Obtiene el valor de un parámetro de la URL (Query String)
  function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  // Muestra alertas informativas basadas en los parámetros de la URL
  function showAlert(containerId = "alertBox") {
    const msg = qs("msg");
    const type = qs("type") || "success";
    if (!msg) return;

    const box = document.getElementById(containerId);
    if (!box) return;

    const safeType = ["success", "warning", "danger", "info"].includes(type)
      ? type
      : "info";
    box.innerHTML = `
      <div class="alert alert-${safeType} alert-dismissible fade show shadow-sm" role="alert">
        ${escapeHtml(msg)}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
  }

  // Escapa caracteres especiales de HTML para prevenir ataques XSS
  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Actualiza la interfaz del encabezado según el estado de autenticación y rol del usuario
  function updateHeaderAuthUI() {
    const auth = getAuth();
    const btnAuth = document.getElementById("btnAuth");
    const btnListar = document.getElementById("btnListar");
    const btnStock = document.getElementById("btnStock");
    const btnReportes = document.getElementById("btnReportes");

    // Mostrar/ocultar botones administrativos según el rol
    const isAdminOrCook =
      auth && ["administrador", "cocinero"].includes(auth.cargo);

    if (btnListar) {
      btnListar.style.display = isAdminOrCook ? "" : "none";
    }
    if (btnStock) {
      btnStock.style.display = isAdminOrCook ? "" : "none";
    }
    if (btnReportes) {
      btnReportes.style.display = auth && auth.cargo === "administrador" ? "" : "none";
    }

    if (btnAuth) {
      if (auth) {
        btnAuth.innerHTML = `<i class="bi bi-box-arrow-right me-1"></i> Salir (${auth.cargo})`;
        btnAuth.classList.remove("text-danger");
        btnAuth.classList.add("text-primary");

        btnAuth.addEventListener("click", (e) => {
          e.preventDefault();
          clearAuth();
          window.location.href =
            "new-order.html?msg=" +
            encodeURIComponent("Sesión cerrada.") +
            "&type=info";
        });
      } else {
        btnAuth.innerHTML = `<i class="bi bi-box-arrow-in-right me-1"></i> Login`;
        btnAuth.classList.add("text-danger");
        btnAuth.classList.remove("text-primary");
      }
    }

    // Proteger acceso a "Listar pedidos" (pantalla 6) y manejar visibilidad
    if (btnListar) {
      const a = getAuth();
      if (!a) {
        // Ocultar si no hay sesión
        btnListar.parentElement.classList.add("d-none");
      } else {
        // Mostrar si hay sesión
        btnListar.parentElement.classList.remove("d-none");
      }

      btnListar.addEventListener("click", (e) => {
        const authNow = getAuth();
        if (!authNow) {
          e.preventDefault();
          window.location.href =
            "login.html?msg=" +
            encodeURIComponent("Debes iniciar sesión para ver los pedidos.") +
            "&type=warning&next=" +
            encodeURIComponent("admin-pedidos.html");
        }
      });
    }
  }

  // Verifica si el usuario actual tiene uno de los roles permitidos
  function requireRole(allowedRoles) {
    const auth = getAuth();
    if (!auth || !allowedRoles.includes(auth.cargo)) {
      const next = encodeURIComponent(
        window.location.pathname.split("/").pop(),
      );
      window.location.href =
        "login.html?msg=" +
        encodeURIComponent(
          "Acceso restringido. No tienes permisos para ver esta página.",
        ) +
        "&type=danger&next=" +
        next;
      return false;
    }
    return true;
  }

  // ====== Stock (se calcula desde pedidos PAGADOS) ======
  const DAILY_CHICKENS = 200; // Stock inicial de pollos
  const SODAS = ["Coca Cola", "Inka Kola", "Fanta", "Sprite", "Cola Escocesa"]; // Marcas disponibles
  const SIZES = ["0.5L", "1L", "1.5L", "2.25L"]; // Tamaños disponibles
  const DAILY_SODA_PER_SIZE = 30; // Stock inicial por gaseosa y por tamaño

  // Calcula el stock restante basado en los pedidos pagados
  function calcStockFromOrders(orders) {
    // Solo pedidos pagados
    const paid = orders.filter((o) => o?.status?.paid);

    // Pollo consumido en "pollos equivalentes"
    let consumedChickens = 0;

    // Gaseosas consumidas: clave = `${brand}|${size}` -> cantidad
    const consumedSodas = {};
    for (const brand of SODAS) {
      for (const size of SIZES) consumedSodas[`${brand}|${size}`] = 0;
    }

    for (const o of paid) {
      const p = o.items?.pollo || {};
      const m = o.items?.mostrito || {};

      consumedChickens += 0.25 * (Number(p.q1_4 || 0) + Number(m.q1_4 || 0));
      consumedChickens += 0.5 * (Number(p.q1_2 || 0) + Number(m.q1_2 || 0));
      consumedChickens += 1.0 * (Number(p.q1 || 0) + Number(m.q1 || 0));

      const gaseosas = Array.isArray(o.items?.gaseosas) ? o.items.gaseosas : [];
      for (const g of gaseosas) {
        const key = `${g.brand}|${g.size}`;
        if (key in consumedSodas) consumedSodas[key] += Number(g.qty || 0);
      }
    }

    const remainingChickens = Math.max(0, DAILY_CHICKENS - consumedChickens);

    // Stock gaseosas: inicial - consumido
    const remainingSodas = {};
    for (const brand of SODAS) {
      for (const size of SIZES) {
        const key = `${brand}|${size}`;
        remainingSodas[key] = Math.max(
          0,
          DAILY_SODA_PER_SIZE - (consumedSodas[key] || 0),
        );
      }
    }

    return {
      chickens: {
        initial: DAILY_CHICKENS,
        consumed: consumedChickens,
        remaining: remainingChickens,
        consumedQuarters: consumedChickens * 4,
        remainingQuarters: remainingChickens * 4,
      },
      sodas: {
        initialPerBrandSize: DAILY_SODA_PER_SIZE,
        consumed: consumedSodas,
        remaining: remainingSodas,
        brands: SODAS,
        sizes: SIZES,
      },
    };
  }

  // ====== Helpers para Pedido ======
  // Genera un ID de pedido único basado en la fecha y un valor aleatorio
  function makeOrderId() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const stamp =
      now.getFullYear() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds());
    const rnd = Math.random().toString(16).slice(2, 6).toUpperCase();
    return `ORD-${stamp}-${rnd}`;
  }

  // Construye el objeto de pedido a partir de los datos del formulario (o del carrito JSON)
  function buildOrderFromForm() {
    const cartJsonEl = $("#cart_json");
    if (cartJsonEl) {
      const cart = safeParse(cartJsonEl.value, []);

      const pollo = { q1_4: 0, q1_2: 0, q1: 0 };
      const mostrito = { q1_4: 0, q1_2: 0, q1: 0 };
      const gaseosas = [];

      for (const item of cart) {
        if (item.type === "pollo") {
          pollo[`q${item.portion}`] = item.qty;
        } else if (item.type === "mostrito") {
          mostrito[`q${item.portion}`] = item.qty;
        } else if (item.type === "gaseosa") {
          gaseosas.push({ brand: item.brand, size: item.size, qty: item.qty });
        }
      }

      if (cart.length === 0) {
        throw new Error(
          "Agrega al menos un producto (pollo, mostrito o gaseosa).",
        );
      }

      return {
        id: makeOrderId(),
        createdAt: new Date().toISOString(),
        items: { pollo, mostrito, gaseosas },
        paymentMethod: null,
        status: { paid: false, cooked: false },
      };
    }

    // Fallback Pollo
    const pollo = {
      q1_4: Number($("#pollo_1_4")?.value || 0),
      q1_2: Number($("#pollo_1_2")?.value || 0),
      q1: Number($("#pollo_1")?.value || 0),
    };

    // Mostrito
    const mostrito = {
      q1_4: Number($("#mostrito_1_4")?.value || 0),
      q1_2: Number($("#mostrito_1_2")?.value || 0),
      q1: Number($("#mostrito_1")?.value || 0),
    };

    // Gaseosas (1 select + 1 qty por marca)
    const gaseosas = [];
    for (const brand of SODAS) {
      const slug = brand.toLowerCase().replaceAll(" ", "_");
      const size = $(`#g_${slug}_size`)?.value || "";
      const qty = Number($(`#g_${slug}_qty`)?.value || 0);

      if (qty > 0) {
        if (!size) throw new Error(`Selecciona tamaño para ${brand}.`);
        gaseosas.push({ brand, size, qty });
      }
    }

    const totalItems =
      pollo.q1_4 +
      pollo.q1_2 +
      pollo.q1 +
      mostrito.q1_4 +
      mostrito.q1_2 +
      mostrito.q1 +
      gaseosas.reduce((acc, g) => acc + g.qty, 0);

    if (totalItems <= 0) {
      throw new Error(
        "Agrega al menos un producto (pollo, mostrito o gaseosa).",
      );
    }

    return {
      id: makeOrderId(),
      createdAt: new Date().toISOString(),
      items: { pollo, mostrito, gaseosas },
      paymentMethod: null,
      status: { paid: false, cooked: false },
    };
  }

  // Renderiza los detalles de un pedido en un contenedor específico
  function renderOrderDetails(order, containerId = "orderDetails") {
    const el = document.getElementById(containerId);
    if (!el) return;

    const p = order.items?.pollo || {};
    const m = order.items?.mostrito || {};
    const g = Array.isArray(order.items?.gaseosas) ? order.items.gaseosas : [];

    const lines = [];

    const pushLine = (label, qty) => {
      if (qty > 0)
        lines.push(`<li class="list-group-item d-flex justify-content-between">
        <span>${label}</span><span class="fw-semibold">${qty}</span>
      </li>`);
    };

    pushLine("Pollo 1/4", Number(p.q1_4 || 0));
    pushLine("Pollo 1/2", Number(p.q1_2 || 0));
    pushLine("Pollo 1", Number(p.q1 || 0));

    pushLine("Mostrito 1/4", Number(m.q1_4 || 0));
    pushLine("Mostrito 1/2", Number(m.q1_2 || 0));
    pushLine("Mostrito 1", Number(m.q1 || 0));

    for (const item of g) {
      lines.push(`<li class="list-group-item d-flex justify-content-between">
        <span>${escapeHtml(item.brand)} (${escapeHtml(item.size)})</span>
        <span class="fw-semibold">${Number(item.qty || 0)}</span>
      </li>`);
    }

    el.innerHTML = `
      <div class="mb-2 text-muted small">Código: <span class="fw-semibold">${escapeHtml(order.id)}</span></div>
      <ul class="list-group">${lines.join("")}</ul>
    `;
  }

  // ====== Páginas ======

  // Lógica para la página de Login
  function pageLogin() {
    updateHeaderAuthUI();
    showAlert("alertBox");

    const form = $("#loginForm");
    if (!form) return;

    const next = qs("next");

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const email = ($("#loginEmail")?.value || "").trim().toLowerCase();
      const pass = $("#loginPassword")?.value || "";

      const users = getUsers();
      const found = users.find((u) => u.email === email && u.password === pass);

      const alertBox = $("#alertBox");
      if (!found) {
        if (alertBox) {
          alertBox.innerHTML = `
            <div class="alert alert-danger shadow-sm">Correo o contraseña incorrectos.</div>
          `;
        }
        return;
      }

      setAuth({
        nombre: found.nombre,
        apellidos: found.apellidos,
        email: found.email,
        cargo: found.cargo,
        direccion: found.direccion,
      });

      const goTo = next ? decodeURIComponent(next) : "new-order.html";
      window.location.href =
        goTo +
        "?msg=" +
        encodeURIComponent("Bienvenido/a. Sesión iniciada.") +
        "&type=success";
    });
  }

  // Lógica para la página de Registro
  function pageRegister() {
    updateHeaderAuthUI();
    showAlert("alertBox");

    const form = $("#registerForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const nombre = ($("#regNombre")?.value || "").trim();
      const apellidos = ($("#regApellidos")?.value || "").trim();
      const email = ($("#regEmail")?.value || "").trim().toLowerCase();
      const direccion = ($("#regDireccion")?.value || "").trim();
      const password = $("#regPassword")?.value || "";
      const confirm = $("#regConfirm")?.value || "";
      const cargo = $("#regCargo")?.value || "";

      const alertBox = $("#alertBox");
      const fail = (m) => {
        if (alertBox)
          alertBox.innerHTML = `<div class="alert alert-danger shadow-sm">${escapeHtml(m)}</div>`;
      };

      if (!nombre || !apellidos || !email || !direccion || !password || !confirm || !cargo)
        return fail("Completa todos los campos.");
      if (password.length < 4)
        return fail("La contraseña debe tener al menos 4 caracteres.");
      if (password !== confirm) return fail("Las contraseñas no coinciden.");

      const users = getUsers();
      if (users.some((u) => u.email === email))
        return fail("Este correo ya está registrado.");

      users.push({ nombre, apellidos, email, direccion, password, cargo });
      saveUsers(users);

      window.location.href =
        "login.html?msg=" +
        encodeURIComponent("Registro exitoso. Ahora inicia sesión.") +
        "&type=success";
    });
  }

  // Lógica para la página de Nuevo Pedido
  function pageNewOrder() {
    updateHeaderAuthUI();
    showAlert("alertBox");

    const form = $("#orderForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      // Verificar login antes de proceder
      const auth = getAuth();
      if (!auth) {
        window.location.href =
          "login.html?msg=" +
          encodeURIComponent("Debes iniciar sesión para realizar un pedido.") +
          "&type=warning&next=new-order.html";
        return;
      }

      const alertBox = $("#alertBox");
      const fail = (m) => {
        if (alertBox)
          alertBox.innerHTML = `<div class="alert alert-danger shadow-sm">${escapeHtml(m)}</div>`;
      };

      try {
        const order = buildOrderFromForm();
        setCurrentOrder(order);
        window.location.href = "order-summary.html";
      } catch (err) {
        fail(err.message || "Error al crear el pedido.");
      }
    });
  }

  // Lógica para la página de Resumen de Pedido
  function pageOrderSummary() {
    updateHeaderAuthUI();
    showAlert("alertBox");

    // Verificar login
    const auth = getAuth();
    if (!auth) {
      window.location.href =
        "login.html?msg=" +
        encodeURIComponent(
          "Debes iniciar sesión para ver el resumen del pedido.",
        ) +
        "&type=warning&next=order-summary.html";
      return;
    }

    const order = getCurrentOrder();
    const alertBox = $("#alertBox");
    if (!order) {
      if (alertBox)
        alertBox.innerHTML = `<div class="alert alert-warning shadow-sm">No hay un pedido actual. Crea uno primero.</div>`;
      const btns = $("#actionsBox");
      if (btns)
        btns.innerHTML = `<a class="btn btn-primary" href="new-order.html">Ir a Nuevo Pedido</a>`;
      return;
    }

    renderOrderDetails(order, "orderDetails");

    const btnPay = $("#btnPay");
    const btnBack = $("#btnBack");

    btnPay?.addEventListener("click", () => {
      const method = $("#paymentMethod")?.value || "";
      if (!method) {
        if (alertBox)
          alertBox.innerHTML = `<div class="alert alert-danger shadow-sm">Selecciona un método de pago.</div>`;
        return;
      }

      // Finalizar pedido (pagar) -> guardar en lista de pedidos + actualizar stock (stock se calcula desde pedidos pagados)
      order.paymentMethod = method;
      order.status.paid = true;

      const orders = getOrders();
      orders.unshift(order); // último primero
      saveOrders(orders);

      // Calcular total para el modal
      let total = 0;
      const p = order.items?.pollo || {};
      const m = order.items?.mostrito || {};
      const gs = order.items?.gaseosas || [];

      total += (p.q1_4 || 0) * PRICES.pollo["1_4"];
      total += (p.q1_2 || 0) * PRICES.pollo["1_2"];
      total += (p.q1 || 0) * PRICES.pollo["1"];
      total += (m.q1_4 || 0) * PRICES.mostrito["1_4"];
      total += (m.q1_2 || 0) * PRICES.mostrito["1_2"];
      total += (m.q1 || 0) * PRICES.mostrito["1"];
      gs.forEach((g) => { total += (g.qty || 0) * (PRICES.gaseosa[g.size] || 0); });

      // Limpiar borrador del carrito (para que new-order aparezca vacío)
      saveCartDraft([]);
      updateCartNavUI();
      clearCurrentOrder();

      // Mostrar Modal
      const modalEl = document.getElementById("successModal");
      if (modalEl) {
        $("#modalOrderId").textContent = order.id;
        $("#modalAddress").textContent = auth.direccion || "Dirección registrada";
        $("#modalPaymentMethod").textContent = order.paymentMethod;
        $("#modalTotalPrice").textContent = `S/ ${total.toFixed(2)}`;

        const bsModal = new bootstrap.Modal(modalEl);
        bsModal.show();

        $("#btnCloseModal")?.addEventListener("click", () => {
          bsModal.hide();
          window.location.href = "new-order.html";
        });
      } else {
        window.location.href = "new-order.html?msg=" + encodeURIComponent("Pedido exitoso");
      }
    });

    btnBack?.addEventListener("click", () => {
      // Regresar sin hacer nada (no guardar)
      clearCurrentOrder();
      window.location.href = "new-order.html";
    });
  }

  // Lógica para la página de Stock
  function pageStock() {
    if (!requireRole(["administrador", "cocinero"])) return;
    updateHeaderAuthUI();

    const orders = getOrders();
    const stock = calcStockFromOrders(orders);

    // Pollos
    const chickensBox = $("#chickensBox");
    if (chickensBox) {
      chickensBox.innerHTML = `
        <div class="card shadow-sm border-0">
          <div class="card-body">
            <h5 class="card-title mb-3"><i class="bi bi-egg-fried text-danger me-2"></i>Stock de Pollos (Diario)</h5>
            <div class="row g-3">
              <div class="col-12 col-md-4">
                <div class="p-3 border rounded bg-light">
                  <div class="text-muted small">Stock inicial</div>
                  <div class="fs-4 fw-semibold">${stock.chickens.initial}</div>
                </div>
              </div>
              <div class="col-12 col-md-4">
                <div class="p-3 border rounded bg-light">
                  <div class="text-muted small">Consumido (pollos equivalentes)</div>
                  <div class="fs-4 fw-semibold text-danger">${stock.chickens.consumed.toFixed(2)}</div>
                  <div class="text-muted small">(${stock.chickens.consumedQuarters.toFixed(0)} cuartos)</div>
                </div>
              </div>
              <div class="col-12 col-md-4">
                <div class="p-3 border rounded bg-light">
                  <div class="text-muted small">Disponible</div>
                  <div class="fs-4 fw-semibold text-success">${stock.chickens.remaining.toFixed(2)}</div>
                  <div class="text-muted small">(${stock.chickens.remainingQuarters.toFixed(0)} cuartos)</div>
                </div>
              </div>
            </div>
            <p class="mt-3 mb-0 text-muted small">
              Nota: Pollo y Mostrito consumen partes del pollo (1/4, 1/2, 1) y se descuenta del stock diario.
            </p>
          </div>
        </div>
      `;
    }

    // Gaseosas
    const sodasBox = $("#sodasBox");
    if (sodasBox) {
      const sizes = stock.sodas.sizes;
      const brands = stock.sodas.brands;

      const headerCols = sizes
        .map((s) => `<th class="text-nowrap">${s}</th>`)
        .join("");
      const rows = brands
        .map((brand) => {
          const cols = sizes
            .map((size) => {
              const key = `${brand}|${size}`;
              const val = stock.sodas.remaining[key];
              const color = val < 5 ? "text-danger fw-bold" : "text-dark";
              return `<td class="text-center ${color}">${val}</td>`;
            })
            .join("");
          return `<tr>
          <td class="text-nowrap fw-semibold">${brand}</td>
          ${cols}
        </tr>`;
        })
        .join("");

      sodasBox.innerHTML = `
        <div class="card shadow-sm border-0">
          <div class="card-body">
            <h5 class="card-title mb-2"><i class="bi bi-cup-straw text-danger me-2"></i>Stock de Gaseosas (Diario)</h5>
            <div class="text-muted small mb-3">Stock inicial: ${stock.sodas.initialPerBrandSize} por tamaño y por gaseosa</div>
            <div class="table-responsive">
              <table class="table table-bordered align-middle">
                <thead class="table-light">
                  <tr>
                    <th>Gaseosa</th>
                    ${headerCols}
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }

    // Botón regresar (opcional)
    const btnGo = $("#btnGoNewOrder");
    btnGo?.addEventListener(
      "click",
      () => (window.location.href = "new-order.html"),
    );
  }

  // Lógica para la página de Reportes
  function pageReportes() {
    if (!requireRole(["administrador"])) return;
    updateHeaderAuthUI();

    const form = $("#reportForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const startVal = $("#startDate")?.value;
      const endVal = $("#endDate")?.value;

      if (!startVal || !endVal) {
        alert("Selecciona ambas fechas.");
        return;
      }

      const start = new Date(startVal);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endVal);
      end.setHours(23, 59, 59, 999);

      const allOrders = getOrders();
      const filtered = allOrders.filter((o) => {
        const d = new Date(o.createdAt);
        return d >= start && d <= end;
      });

      renderReport(filtered);
    });
  }

  // Renderiza el informe de ventas basado en los pedidos filtrados
  function renderReport(orders) {
    const results = $("#reportResults");
    if (!results) return;

    if (orders.length === 0) {
      results.innerHTML = `<div class="alert alert-info shadow-sm">No hay pedidos en este rango de fechas.</div>`;
      return;
    }

    let totalGeneral = 0;
    const orderRows = orders
      .map((o) => {
        let orderTotal = 0;
        const details = [];

        const p = o.items?.pollo || {};
        const m = o.items?.mostrito || {};
        const gs = o.items?.gaseosas || [];

        // Pollo
        if (p.q1_4) {
          const cost = p.q1_4 * PRICES.pollo["1_4"];
          orderTotal += cost;
          details.push(`${p.q1_4} x Pollo 1/4`);
        }
        if (p.q1_2) {
          const cost = p.q1_2 * PRICES.pollo["1_2"];
          orderTotal += cost;
          details.push(`${p.q1_2} x Pollo 1/2`);
        }
        if (p.q1) {
          const cost = p.q1 * PRICES.pollo["1"];
          orderTotal += cost;
          details.push(`${p.q1} x Pollo 1`);
        }

        // Mostrito
        if (m.q1_4) {
          const cost = m.q1_4 * PRICES.mostrito["1_4"];
          orderTotal += cost;
          details.push(`${m.q1_4} x Mostrito 1/4`);
        }
        if (m.q1_2) {
          const cost = m.q1_2 * PRICES.mostrito["1_2"];
          orderTotal += cost;
          details.push(`${m.q1_2} x Mostrito 1/2`);
        }
        if (m.q1) {
          const cost = m.q1 * PRICES.mostrito["1"];
          orderTotal += cost;
          details.push(`${m.q1} x Mostrito 1`);
        }

        // Gaseosas
        gs.forEach((g) => {
          const cost = Number(g.qty || 0) * (PRICES.gaseosa[g.size] || 0);
          orderTotal += cost;
          details.push(`${g.qty} x Gaseosa ${g.brand} (${g.size})`);
        });

        totalGeneral += orderTotal;

        return `
        <tr>
          <td class="small fw-bold">${escapeHtml(o.id)}</td>
          <td class="small text-nowrap">${new Date(o.createdAt).toLocaleDateString()} ${new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
          <td class="small">${details.join(", ")}</td>
          <td class="text-end fw-bold">S/ ${orderTotal.toFixed(2)}</td>
        </tr>
      `;
      })
      .join("");

    results.innerHTML = `
      <div class="card shadow-sm border-0 bg-white p-4">
        <h2 class="h5 mb-4 text-center border-bottom pb-2">Detalle de Ventas por Pedido</h2>

        <div class="table-responsive mb-4">
          <table class="table table-hover table-bordered align-middle mb-0">
            <thead class="table-danger text-white">
              <tr>
                <th>Pedido ID</th>
                <th>Fecha</th>
                <th>Detalle de Productos</th>
                <th class="text-end">Total (S/)</th>
              </tr>
            </thead>
            <tbody>
              ${orderRows}
            </tbody>
            <tfoot class="table-light">
              <tr>
                <td colspan="3" class="text-end fw-bold fs-5">TOTAL GENERAL:</td>
                <td class="text-end fw-bold fs-5 text-danger">S/ ${totalGeneral.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="text-center text-muted small">
          Pedidos procesados en este rango: ${orders.length}
        </div>
      </div>
    `;
  }

  // Lógica para la página de Administración de Pedidos (Cocinero/Admin)
  function pageAdminPedidos() {
    if (!requireRole(["administrador", "cocinero"])) return;
    updateHeaderAuthUI();
    showAlert("alertBox");

    const orders = getOrders(); // ya están pagados
    const wrap = $("#ordersWrap");

    if (!wrap) return;

    if (!orders.length) {
      wrap.innerHTML = `<div class="alert alert-info shadow-sm">Aún no hay pedidos pagados.</div>`;
      return;
    }

    const cards = orders
      .map((order) => {
        const p = order.items?.pollo || {};
        const m = order.items?.mostrito || {};
        const g = Array.isArray(order.items?.gaseosas)
          ? order.items.gaseosas
          : [];

        const lines = [];
        const add = (txt, qty) => {
          if (Number(qty || 0) > 0)
            lines.push(`<li>${escapeHtml(txt)}: <b>${Number(qty)}</b></li>`);
        };

        add("Pollo 1/4", p.q1_4);
        add("Pollo 1/2", p.q1_2);
        add("Pollo 1", p.q1);

        add("Mostrito 1/4", m.q1_4);
        add("Mostrito 1/2", m.q1_2);
        add("Mostrito 1", m.q1);

        for (const item of g) {
          lines.push(
            `<li>${escapeHtml(item.brand)} (${escapeHtml(item.size)}): <b>${Number(item.qty || 0)}</b></li>`,
          );
        }

        const cooked = !!order.status?.cooked;
        const badge = cooked
          ? `<span class="badge text-bg-success shadow-sm">Cocinado</span>`
          : `<span class="badge text-bg-warning shadow-sm">Pendiente</span>`;

        const pay = order.paymentMethod ? escapeHtml(order.paymentMethod) : "—";

        return `
        <div class="card mb-3 shadow-sm border-0">
          <div class="card-body">
            <div class="d-flex flex-wrap justify-content-between align-items-start gap-2">
              <div>
                <h6 class="mb-1"><i class="bi bi-receipt me-1"></i>Pedido ${escapeHtml(order.id)} ${badge}</h6>
                <div class="text-muted small">Pago: <b>${pay}</b> | ${new Date(order.createdAt).toLocaleString()}</div>
              </div>
              <button class="btn btn-sm shadow-sm ${cooked ? "btn-outline-success" : "btn-success"}" data-action="toggleCooked" data-id="${escapeHtml(order.id)}">
                ${cooked ? '<i class="bi bi-arrow-counterclockwise"></i> Quitar check' : '<i class="bi bi-check-lg"></i> Marcar cocinado ✓'}
              </button>
            </div>

            <hr class="my-3"/>

            <ul class="mb-0">
              ${lines.join("") || "<li>(Sin detalle)</li>"}
            </ul>
          </div>
        </div>
      `;
      })
      .join("");

    wrap.innerHTML = cards;

    // Maneja el clic para marcar un pedido como cocinado o pendiente
    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action='toggleCooked']");
      if (!btn) return;

      const id = btn.getAttribute("data-id");
      const all = getOrders();
      const idx = all.findIndex((o) => o.id === id);
      if (idx === -1) return;

      all[idx].status = all[idx].status || {};
      all[idx].status.cooked = !all[idx].status.cooked;
      saveOrders(all);

      // recargar simple
      window.location.reload();
    });

    $("#btnRegresar")?.addEventListener("click", () => {
      window.location.href = "new-order.html";
    });
  }

  // ====== Router por atributo data-page ======
  // Ejecuta la lógica correspondiente según la página cargada
  document.addEventListener("DOMContentLoaded", () => {
    updateHeaderAuthUI();
    updateCartNavUI();

    // Maneja el clic global en el botón "Ver Carrito"
    document.addEventListener("click", (e) => {
      if (e.target.closest("#btnVerCarrito")) {
        e.preventDefault();
        try {
          const order = buildOrderFromForm();
          setCurrentOrder(order);
          window.location.href = "order-summary.html";
        } catch (err) {
          // Si hay un error al construir el pedido (ej. carrito vacío), se muestra un resumen simple
          showCartSummary();
        }
      }
    });

    const page = document.body.getAttribute("data-page");
    if (!page) return;

    if (page === "login") pageLogin();
    if (page === "register") pageRegister();
    if (page === "new-order") pageNewOrder();
    if (page === "order-summary") pageOrderSummary();
    if (page === "stock") pageStock();
    if (page === "admin-pedidos") pageAdminPedidos();
    if (page === "reportes") pageReportes();
  });

  // Exponer algunas cosas globalmente bajo el espacio de nombres PAS
  window.PAS = {
    requireRole,
    getAuth,
    getOrders,
    calcStockFromOrders,
    getCartDraft,
    saveCartDraft,
    updateCartNavUI,
  };
})();
