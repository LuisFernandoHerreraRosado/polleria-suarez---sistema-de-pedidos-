/* app.js - Pollos a la Brasa Suárez (sin BD)
   - Usuarios: localStorage (pas_users)
   - Sesión:   localStorage (pas_auth)
   - Pedidos:  localStorage (pas_orders)
   - Pedido actual (cliente): sessionStorage (pas_current_order)
*/

(() => {
  const KEYS = {
    USERS: "pas_users",
    AUTH: "pas_auth",
    ORDERS: "pas_orders",
    CURRENT_ORDER: "pas_current_order",
  };

  const $ = (sel) => document.querySelector(sel);

  function safeParse(json, fallback) {
    try {
      return JSON.parse(json) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function getUsers() {
    return safeParse(localStorage.getItem(KEYS.USERS), []);
  }
  function saveUsers(users) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  }

  function getAuth() {
    return safeParse(localStorage.getItem(KEYS.AUTH), null);
  }
  function setAuth(user) {
    localStorage.setItem(KEYS.AUTH, JSON.stringify(user));
  }
  function clearAuth() {
    localStorage.removeItem(KEYS.AUTH);
  }

  function getOrders() {
    return safeParse(localStorage.getItem(KEYS.ORDERS), []);
  }
  function saveOrders(orders) {
    localStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
  }

  function getCurrentOrder() {
    return safeParse(sessionStorage.getItem(KEYS.CURRENT_ORDER), null);
  }
  function setCurrentOrder(order) {
    sessionStorage.setItem(KEYS.CURRENT_ORDER, JSON.stringify(order));
  }
  function clearCurrentOrder() {
    sessionStorage.removeItem(KEYS.CURRENT_ORDER);
  }

  function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

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
      <div class="alert alert-${safeType} alert-dismissible fade show" role="alert">
        ${escapeHtml(msg)}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function updateHeaderAuthUI() {
    const auth = getAuth();
    const btnAuth = document.getElementById("btnAuth");
    const btnListar = document.getElementById("btnListar");

    if (btnAuth) {
      if (auth) {
        btnAuth.textContent = `Salir (${auth.cargo})`;
        btnAuth.classList.remove("btn-primary");
        btnAuth.classList.add("btn-outline-primary");

        btnAuth.addEventListener("click", (e) => {
          e.preventDefault();
          clearAuth();
          window.location.href =
            "new-order.html?msg=" +
            encodeURIComponent("Sesión cerrada.") +
            "&type=info";
        });
      } else {
        btnAuth.textContent = "Login";
        btnAuth.classList.add("btn-primary");
        btnAuth.classList.remove("btn-outline-primary");
      }
    }

    // Proteger acceso a "Listar pedidos" (pantalla 6) si no hay login
    if (btnListar) {
      btnListar.addEventListener("click", (e) => {
        const a = getAuth();
        if (!a) {
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

  function requireRole(allowedRoles) {
    const auth = getAuth();
    if (!auth || !allowedRoles.includes(auth.cargo)) {
      const next = encodeURIComponent(
        window.location.pathname.split("/").pop(),
      );
      window.location.href =
        "login.html?msg=" +
        encodeURIComponent(
          "Acceso restringido. Inicia sesión como administrador o cocinero.",
        ) +
        "&type=danger&next=" +
        next;
      return false;
    }
    return true;
  }

  // ====== Stock (se calcula desde pedidos PAGADOS) ======
  const DAILY_CHICKENS = 200;
  const SODAS = ["Coca Cola", "Inka Kola", "Fanta", "Sprite", "Cola Escocesa"];
  const SIZES = ["0.5L", "1L", "1.5L", "2.25L"];
  const DAILY_SODA_PER_SIZE = 30; // por gaseosa y por tamaño

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

    // Pollo
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
            <div class="alert alert-danger">Correo o contraseña incorrectos.</div>
          `;
        }
        return;
      }

      setAuth({
        nombre: found.nombre,
        apellidos: found.apellidos,
        email: found.email,
        cargo: found.cargo,
      });

      const goTo = next ? decodeURIComponent(next) : "admin-pedidos.html";
      window.location.href =
        goTo +
        "?msg=" +
        encodeURIComponent("Bienvenido/a. Sesión iniciada.") +
        "&type=success";
    });
  }

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
      const password = $("#regPassword")?.value || "";
      const confirm = $("#regConfirm")?.value || "";
      const cargo = $("#regCargo")?.value || "";

      const alertBox = $("#alertBox");
      const fail = (m) => {
        if (alertBox)
          alertBox.innerHTML = `<div class="alert alert-danger">${escapeHtml(m)}</div>`;
      };

      if (!nombre || !apellidos || !email || !password || !confirm || !cargo)
        return fail("Completa todos los campos.");
      if (password.length < 4)
        return fail("La contraseña debe tener al menos 4 caracteres.");
      if (password !== confirm) return fail("Las contraseñas no coinciden.");

      const users = getUsers();
      if (users.some((u) => u.email === email))
        return fail("Este correo ya está registrado.");

      users.push({ nombre, apellidos, email, password, cargo });
      saveUsers(users);

      window.location.href =
        "login.html?msg=" +
        encodeURIComponent("Registro exitoso. Ahora inicia sesión.") +
        "&type=success";
    });
  }

  function pageNewOrder() {
    updateHeaderAuthUI();
    showAlert("alertBox");

    const form = $("#orderForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const alertBox = $("#alertBox");
      const fail = (m) => {
        if (alertBox)
          alertBox.innerHTML = `<div class="alert alert-danger">${escapeHtml(m)}</div>`;
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

  function pageOrderSummary() {
    updateHeaderAuthUI();
    showAlert("alertBox");

    const order = getCurrentOrder();
    const alertBox = $("#alertBox");
    if (!order) {
      if (alertBox)
        alertBox.innerHTML = `<div class="alert alert-warning">No hay un pedido actual. Crea uno primero.</div>`;
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
          alertBox.innerHTML = `<div class="alert alert-danger">Selecciona un método de pago.</div>`;
        return;
      }

      // Finalizar pedido (pagar) -> guardar en lista de pedidos + actualizar stock (stock se calcula desde pedidos pagados)
      order.paymentMethod = method;
      order.status.paid = true;

      const orders = getOrders();
      orders.unshift(order); // último primero
      saveOrders(orders);

      clearCurrentOrder();

      window.location.href =
        "new-order.html?msg=" +
        encodeURIComponent("Se realizó el pedido con éxito") +
        "&type=success";
    });

    btnBack?.addEventListener("click", () => {
      // Regresar sin hacer nada (no guardar)
      clearCurrentOrder();
      window.location.href = "new-order.html";
    });
  }

  function pageStock() {
    if (!requireRole(["administrador", "cocinero"])) return;
    updateHeaderAuthUI();

    const orders = getOrders();
    const stock = calcStockFromOrders(orders);

    // Pollos
    const chickensBox = $("#chickensBox");
    if (chickensBox) {
      chickensBox.innerHTML = `
        <div class="card">
          <div class="card-body">
            <h5 class="card-title mb-3">Stock de Pollos (Diario)</h5>
            <div class="row g-3">
              <div class="col-12 col-md-4">
                <div class="p-3 border rounded">
                  <div class="text-muted small">Stock inicial</div>
                  <div class="fs-4 fw-semibold">${stock.chickens.initial}</div>
                </div>
              </div>
              <div class="col-12 col-md-4">
                <div class="p-3 border rounded">
                  <div class="text-muted small">Consumido (pollos equivalentes)</div>
                  <div class="fs-4 fw-semibold">${stock.chickens.consumed.toFixed(2)}</div>
                  <div class="text-muted small">(${stock.chickens.consumedQuarters.toFixed(0)} cuartos)</div>
                </div>
              </div>
              <div class="col-12 col-md-4">
                <div class="p-3 border rounded">
                  <div class="text-muted small">Disponible</div>
                  <div class="fs-4 fw-semibold">${stock.chickens.remaining.toFixed(2)}</div>
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
              return `<td class="text-center">${stock.sodas.remaining[key]}</td>`;
            })
            .join("");
          return `<tr>
          <td class="text-nowrap fw-semibold">${brand}</td>
          ${cols}
        </tr>`;
        })
        .join("");

      sodasBox.innerHTML = `
        <div class="card">
          <div class="card-body">
            <h5 class="card-title mb-2">Stock de Gaseosas (Diario)</h5>
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

  function pageAdminPedidos() {
    if (!requireRole(["administrador", "cocinero"])) return;
    updateHeaderAuthUI();
    showAlert("alertBox");

    const orders = getOrders(); // ya están pagados
    const wrap = $("#ordersWrap");

    if (!wrap) return;

    if (!orders.length) {
      wrap.innerHTML = `<div class="alert alert-info">Aún no hay pedidos pagados.</div>`;
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
          ? `<span class="badge text-bg-success">Cocinado</span>`
          : `<span class="badge text-bg-warning">Pendiente</span>`;

        const pay = order.paymentMethod ? escapeHtml(order.paymentMethod) : "—";

        return `
        <div class="card mb-3">
          <div class="card-body">
            <div class="d-flex flex-wrap justify-content-between align-items-start gap-2">
              <div>
                <h6 class="mb-1">Pedido ${escapeHtml(order.id)} ${badge}</h6>
                <div class="text-muted small">Pago: <b>${pay}</b> | ${new Date(order.createdAt).toLocaleString()}</div>
              </div>
              <button class="btn btn-sm ${cooked ? "btn-outline-success" : "btn-success"}" data-action="toggleCooked" data-id="${escapeHtml(order.id)}">
                ${cooked ? "Quitar check" : "Marcar cocinado ✓"}
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
  document.addEventListener("DOMContentLoaded", () => {
    updateHeaderAuthUI();

    const page = document.body.getAttribute("data-page");
    if (!page) return;

    if (page === "login") pageLogin();
    if (page === "register") pageRegister();
    if (page === "new-order") pageNewOrder();
    if (page === "order-summary") pageOrderSummary();
    if (page === "stock") pageStock();
    if (page === "admin-pedidos") pageAdminPedidos();
  });

  // Exponer algunas cosas si quieres usarlas luego
  window.PAS = {
    requireRole,
    getAuth,
    getOrders,
    calcStockFromOrders,
  };
})();
