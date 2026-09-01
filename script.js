// --- MANEJO DE PERSISTENCIA ---
function loadStorage(key, defaultValue) {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : defaultValue;
}

function saveStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Configuración por defecto del sistema (Neutro)
const defaultConfig = {
  appName: "Valhalla System Capital Humano",
  primaryColor: "#0878ee",
  bgImage: "",
  appLogoImg: "" 
};

// Carga la configuración propia del usuario activo (o neutra si no hay sesión)
function loadUserConfig() {
  if (!currentUser) return defaultConfig;
  return loadStorage(`app_config_${currentUser}`, defaultConfig);
}

let currentUser = null;
let currentUserRole = "admin";

let users = loadStorage("app_users", [
  { user: "admin", pass: "1234", role: "admin", nombre: "Administrador General", email: "admin@valhalla.com", whatsapp: "+5491100000000" },
  { user: "usuario", pass: "1234", role: "usuario", nombre: "Usuario Operativo", email: "usuario@valhalla.com", whatsapp: "" }
]);

let employees = loadStorage("app_employees", []);
let attendance = loadStorage("app_attendance", []);
let auditLogs = loadStorage("app_auditLogs", [
  { id: 1, fechaHora: new Date().toLocaleString("es-AR"), usuario: "sistema", accion: "Sistema iniciado", owner: "admin" }
]);

let records = loadStorage("app_records", {
  seguridad: [], salud: [], desempeno: [], capacitaciones: [], encuestas: [], recibos: [], vacaciones: [], ausencias: [], legajos: []
});

const titles = {
  dashboard: "Dashboard", personal: "Administración de personal", asistencia: "Control de asistencia",
  seguridad: "Higiene y seguridad", salud: "Salud ocupacional", desempeno: "Gestión de desempeño",
  capacitaciones: "Capacitaciones", encuestas: "Encuestas de clima", legajos: "Legajos digitales",
  vacaciones: "Vacaciones y licencias", recibos: "Recibos de sueldo", ausencias: "Ausencias",
  historial: "Historial de sistema (Auditoría)", config: "Configuración y Personalización"
};

let current = "dashboard";

document.addEventListener("DOMContentLoaded", () => {
  applyAppTheme();

  const dateEl = document.getElementById("date");
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  const nav = document.getElementById("nav");
  if (nav) {
    nav.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const page = btn.getAttribute("data-page");
      if (page) {
        document.querySelectorAll("#nav button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        render(page);
      }
    });
  }
});

function applyAppTheme() {
  const userConfig = loadUserConfig();

  const headerTitle = document.getElementById("appTitleHeader");
  const sidebarTitle = document.getElementById("sidebarTitle");
  if (headerTitle) headerTitle.textContent = userConfig.appName;
  if (sidebarTitle) sidebarTitle.textContent = userConfig.appName;
  document.title = userConfig.appName;

  // Aplicar Color Principal
  document.documentElement.style.setProperty('--primary-color', userConfig.primaryColor);

  // Aplicar Logo individual
  const appLogo = document.getElementById("appLogo");
  const sidebarLogo = document.getElementById("sidebarLogo");
  if (userConfig.appLogoImg) {
    const imgHtml = `<img src="${userConfig.appLogoImg}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
    if (appLogo) appLogo.innerHTML = imgHtml;
    if (sidebarLogo) sidebarLogo.innerHTML = imgHtml;
  } else {
    if (appLogo) appLogo.textContent = "CH";
    if (sidebarLogo) sidebarLogo.textContent = "CH";
  }

  // Aplicar Fondo de pantalla individual
  const loginScreen = document.getElementById("login");
  if (loginScreen) {
    loginScreen.style.backgroundImage = userConfig.bgImage ? `url('${userConfig.bgImage}')` : `linear-gradient(135deg, #071a33, ${userConfig.primaryColor})`;
    loginScreen.style.backgroundSize = "cover";
    loginScreen.style.backgroundPosition = "center";
  }

  const appScreen = document.getElementById("app");
  if (appScreen) {
    if (userConfig.bgImage) {
      appScreen.style.backgroundImage = `url('${userConfig.bgImage}')`;
      appScreen.style.backgroundSize = "cover";
      appScreen.style.backgroundAttachment = "fixed";
    } else {
      appScreen.style.backgroundImage = "none";
      appScreen.style.backgroundColor = ""; 
    }
  }
}

function updateHeaderUserInfo() {
  const userAcc = users.find(u => u.user === currentUser);
  const nameDisp = document.getElementById("userNameDisplay");
  const roleDisp = document.getElementById("userRoleDisplay");
  const avatar = document.getElementById("userAvatar");

  if (userAcc) {
    if (nameDisp) nameDisp.textContent = userAcc.nombre || userAcc.user;
    if (roleDisp) roleDisp.textContent = userAcc.role === 'admin' ? 'Administrador' : 'Usuario Operativo';
    if (avatar) avatar.textContent = (userAcc.nombre || userAcc.user).charAt(0).toUpperCase();
  }
}

function addLog(accion, empleadoAsociado = "General") {
  auditLogs.unshift({ 
    id: Date.now(), 
    fechaHora: new Date().toLocaleString("es-AR"), 
    usuario: currentUser || "Anonimo", 
    empleado: empleadoAsociado,
    accion: accion,
    owner: currentUser || "sistema"
  });
  saveStorage("app_auditLogs", auditLogs);
}

// NUEVA FUNCIÓN CON COMPRESIÓN DE IMÁGENES AUTOMÁTICA
function getBase64(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedBase64);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}

function checkAdminPassword() {
  const adminAcc = users.find(u => u.role === "admin");
  const passPrompt = prompt("🔐 Confirmación de seguridad: Ingrese la clave de Administrador:");
  if (!passPrompt) return false;
  if (adminAcc && passPrompt === adminAcc.pass) {
    return true;
  }
  alert("❌ Clave de administrador incorrecta.");
  return false;
}

function toggleSide() {
  document.querySelector(".sidebar").classList.toggle("open");
}

function login(event) {
  if (event) event.preventDefault();
  const uInput = document.getElementById("loginUser");
  const pInput = document.getElementById("loginPass");

  const u = uInput ? uInput.value.trim().toLowerCase() : "";
  const p = pInput ? pInput.value.trim() : "";

  const found = users.find(account => account.user.trim().toLowerCase() === u && account.pass.trim() === p);

  if (found) {
    currentUser = found.user;
    currentUserRole = found.role;
    document.getElementById("login").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    if (pInput) pInput.value = ""; 
    updateHeaderUserInfo();
    applyAppTheme();
    addLog(`Sesión iniciada por usuario: ${found.user}`);
    render("dashboard");
    return false;
  }
  alert("Usuario o contraseña incorrectos.");
  return false;
}

function logout() {
  addLog("Cierre de sesión.");
  currentUser = null;
  currentUserRole = "admin";
  document.getElementById("app").classList.add("hidden");
  document.getElementById("login").classList.remove("hidden");
  
  applyAppTheme();
}

function render(p) {
  current = p;
  const userConfig = loadUserConfig();
  const pageTitle = document.getElementById("pageTitle");
  if (pageTitle) pageTitle.textContent = titles[p] || userConfig.appName;

  const content = document.getElementById("content");
  if (!content) return;

  const filteredEmployees = employees.filter(e => currentUserRole === 'admin' ? true : e.owner === currentUser);

  if (p === "dashboard") {
    content.innerHTML = `
      <div class="welcome"><div><h1>Dashboard</h1><div class="muted">Bienvenido (${currentUserRole === 'admin' ? 'Administrador' : 'Usuario'}).</div></div></div>
      <div class="stats">
        <div class="stat"><div><span class="muted">Total Empleados</span><div class="num">${filteredEmployees.length}</div></div></div>
      </div>
      <div class="card" style="margin-top:18px"><h3>Personal reciente</h3>${employeeTable(5)}</div>`;
  } else if (p === "personal" || p === "legajos") {
    content.innerHTML = `
      <div class="welcome">
        <div><h1>${titles[p]}</h1></div>
        <button class="primary" onclick="openEmployee()">+ Nuevo empleado</button>
      </div>
      <div class="actions">
        <input id="empSearch" class="search" placeholder="Buscar empleado..." onkeyup="filterEmployees()">
      </div>
      <div id="empTable" class="card">${employeeTable()}</div>`;
  } else if (p === "asistencia") {
    content.innerHTML = `
      <div class="welcome">
        <div><h1>Control de asistencia</h1></div>
        <div>
          <button class="primary" style="background:#10b981; margin-right: 8px;" onclick="openRemoteAttendanceModal('Entrada')">📍 Fichar Entrada GPS</button>
          <button class="primary" style="background:#ef4444;" onclick="openRemoteAttendanceModal('Salida')">📍 Fichar Salida GPS</button>
        </div>
      </div>
      <div class="card">${attendanceTable()}</div>`;
  } else if (p === "config") {
    content.innerHTML = renderConfigAndUsersModule();
  } else if (p === "historial") {
    content.innerHTML = renderHistorialModule();
  } else if (p === "vacaciones" || p === "ausencias") {
    content.innerHTML = renderRangoDatesModule(p, titles[p]);
  } else {
    content.innerHTML = renderCustomModule(p, titles[p] || p, ["Empleado / Título", "Detalle", "Estado", "Fecha / Periodo", "Comprobante / Foto"], `openGenericModal('${p}', 'Registrar ${titles[p]}')`);
  }
}

// --- NOTIFICACIONES ---
function openNotificationModal() {
  const userAcc = users.find(u => u.user === currentUser) || {};
  const adminAcc = users.find(u => u.role === "admin") || {};

  openModal(`
    <h2>🔔 Centro de Notificaciones y Alertas</h2>
    <p class="muted">Vinculá tus canales para recibir avisos e informes del sistema.</p>
    
    <div class="card" style="margin-bottom:15px; background:#f8fafc;">
      <h4>Tus Datos de Contacto Directo</h4>
      <div class="form-grid">
        <label>Correo / Gmail
          <input type="email" id="notif_userEmail" value="${userAcc.email || ''}" placeholder="ejemplo@gmail.com">
        </label>
        <label>WhatsApp (con código de país)
          <input type="tel" id="notif_userWp" value="${userAcc.whatsapp || ''}" placeholder="+5491122334455">
        </label>
      </div>
      <button class="primary" style="margin-top:10px;" onclick="saveNotificationContact()">Guardar Contacto</button>
    </div>

    <div class="card">
      <h4>Enviar Reporte / Alerta Directa al Administrador</h4>
      <p class="muted">Escribí una novedad para enviarla directamente al correo o WhatsApp del administrador (${adminAcc.nombre || 'Admin'}).</p>
      <textarea id="notif_mensaje" style="width:100%; padding:8px; border-radius:8px;" placeholder="Escriba su mensaje o alerta aquí..."></textarea>
      <div style="display:flex; gap:10px; margin-top:10px;">
        <button class="primary" style="background:#25D366;" onclick="sendWhatsAppAdmin()">💬 Enviar por WhatsApp</button>
        <button class="primary" style="background:#ea4335;" onclick="sendEmailAdmin()">✉️ Enviar por Gmail</button>
      </div>
    </div>
  `);
}

function saveNotificationContact() {
  const userAcc = users.find(u => u.user === currentUser);
  if (userAcc) {
    userAcc.email = document.getElementById("notif_userEmail").value.trim();
    userAcc.whatsapp = document.getElementById("notif_userWp").value.trim();
    saveStorage("app_users", users);
    alert("¡Datos de contacto guardados correctamente!");
  }
}

function sendWhatsAppAdmin() {
  const adminAcc = users.find(u => u.role === "admin") || {};
  const msg = document.getElementById("notif_mensaje").value.trim();
  if (!msg) return alert("Por favor, ingresá un mensaje.");

  const userConfig = loadUserConfig();
  const wpNum = adminAcc.whatsapp ? adminAcc.whatsapp.replace(/[^0-9]/g, '') : "";
  const text = encodeURIComponent(`*Notificación de ${currentUser} (${userConfig.appName}):*\n${msg}`);
  
  if (wpNum) {
    window.open(`https://wa.me/${wpNum}?text=${text}`, '_blank');
  } else {
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }
}

function sendEmailAdmin() {
  const adminAcc = users.find(u => u.role === "admin") || {};
  const msg = document.getElementById("notif_mensaje").value.trim();
  if (!msg) return alert("Por favor, ingresá un mensaje.");

  const userConfig = loadUserConfig();
  const targetEmail = adminAcc.email || "";
  const subject = encodeURIComponent(`Alerta / Notificación de ${currentUser} - ${userConfig.appName}`);
  const body = encodeURIComponent(`${msg}\n\nEnviado desde la plataforma ${userConfig.appName}`);

  window.open(`mailto:${targetEmail}?subject=${subject}&body=${body}`, '_blank');
}

// --- CONFIGURACIÓN Y PERSONALIZACIÓN DE USUARIO ---
function renderConfigAndUsersModule() {
  const adminAccount = users.find(u => u.role === "admin") || { user: "admin", pass: "1234", nombre: "Administrador" };
  const userConfig = loadUserConfig();

  let userRows = users.map((u, i) => `
    <tr>
      <td><b>${u.user}</b></td>
      <td>${u.nombre}</td>
      <td>${u.role}</td>
      <td>
        ${currentUserRole === 'admin' && u.role !== 'admin' ? `<button class="secondary" style="color:red;border-color:#fca5a5" onclick="deleteUser(${i})">Eliminar</button>` : 'Protegido'}
      </td>
    </tr>`).join('');

  return `
    <div class="welcome">
      <div><h1>Configuración y Seguridad</h1></div>
      ${currentUserRole === 'admin' ? `<button class="primary" onclick="openCreateUserModal()">+ Crear Nueva Cuenta</button>` : ''}
    </div>

    ${currentUserRole === 'admin' ? `
    <div class="card" style="margin-bottom: 20px;">
      <h3>🔐 Credenciales del Administrador (Modificar Clave)</h3>
      <div class="form-grid" style="margin-top:10px;">
        <label>Nombre del Administrador
          <input id="cfg_adminNombre" value="${adminAccount.nombre}">
        </label>
        <label>Usuario Admin
          <input id="cfg_adminUser" value="${adminAccount.user}">
        </label>
        <label>Nueva Clave de Administrador
          <input type="password" id="cfg_adminPass" value="${adminAccount.pass}">
        </label>
      </div><br>
      <button class="primary" onclick="saveAdminCredentials()">Guardar Credenciales de Admin</button>
    </div>
    ` : ''}

    <div class="card" style="margin-bottom: 20px;">
      <h3>Personalizar Mi Cuenta (Marca, Logo y Fondo)</h3>
      <p class="muted">Los cambios aplicados aquí solo se reflejarán en tu usuario actual (<b>${currentUser}</b>).</p>
      <div class="form-grid" style="margin-top:10px;">
        <label>Nombre del Sistema / Empresa
          <input id="cfg_appName" value="${userConfig.appName}">
        </label>
        <label>Color Principal (Botones y Selección)
          <input type="color" id="cfg_color" value="${userConfig.primaryColor}" style="height:42px; padding:2px;">
        </label>
        <label>Mi Logo Personalizado (Reemplaza "CH")
          <input type="file" id="cfg_appLogoImg" accept="image/*">
        </label>
        <label>Mi Imagen de Fondo
          <input type="file" id="cfg_bgImage" accept="image/*">
        </label>
      </div><br>
      <button class="primary" onclick="saveSystemCustomization()">Guardar Mi Personalización</button>
    </div>

    <div class="card">
      <h3>Cuentas de Usuarios Registradas</h3>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Usuario</th><th>Nombre / Detalle</th><th>Rol</th><th>Acción</th></tr></thead>
          <tbody>${userRows}</tbody>
        </table>
      </div>
    </div>`;
}

function saveAdminCredentials() {
  if (currentUserRole !== 'admin') {
    return alert("❌ Solo el Administrador general puede modificar estas credenciales.");
  }

  const adminAcc = users.find(u => u.role === "admin");
  const newName = document.getElementById("cfg_adminNombre").value.trim();
  const newUser = document.getElementById("cfg_adminUser").value.trim();
  const newPass = document.getElementById("cfg_adminPass").value.trim();

  if (!newUser || !newPass) return alert("El usuario y clave de administrador no pueden estar vacíos.");

  if (adminAcc) {
    adminAcc.nombre = newName;
    adminAcc.user = newUser;
    adminAcc.pass = newPass;
    saveStorage("app_users", users);
    updateHeaderUserInfo();
    addLog("Se actualizaron las credenciales y clave de Administrador.");
    alert("¡Credenciales de administrador actualizadas con éxito!");
    render("config");
  }
}

async function saveSystemCustomization() {
  try {
    let userConfig = loadStorage(`app_config_${currentUser}`, { ...defaultConfig });

    const nameInput = document.getElementById("cfg_appName");
    const colorInput = document.getElementById("cfg_color");
    const bgInput = document.getElementById("cfg_bgImage");
    const logoInput = document.getElementById("cfg_appLogoImg");

    if (nameInput && nameInput.value.trim()) {
      userConfig.appName = nameInput.value.trim();
    }
    
    if (colorInput) {
      userConfig.primaryColor = colorInput.value;
    }

    // Procesar Fondo con compresión
    if (bgInput && bgInput.files && bgInput.files[0]) {
      userConfig.bgImage = await getBase64(bgInput.files[0], 1200, 0.6);
    }

    // Procesar Logo con compresión
    if (logoInput && logoInput.files && logoInput.files[0]) {
      userConfig.appLogoImg = await getBase64(logoInput.files[0], 400, 0.7);
    }

    saveStorage(`app_config_${currentUser}`, userConfig);
    applyAppTheme();
    addLog(`Se actualizó la apariencia individual de ${currentUser}.`);
    alert("¡Personalización individual guardada con éxito!");
    render("config");

  } catch (error) {
    console.error("Error al guardar personalización:", error);
    alert("❌ Error al guardar: No se pudo procesar la imagen.");
  }
}

// --- ALTA Y GESTIÓN DE EMPLEADOS ---
function openEmployee() {
  openModal(`<h2>Nuevo Empleado</h2>
    <div class="form-grid">
      <label>N° de Legajo<input id="newLegajoNum" placeholder="ej. LEG-001"></label>
      <label>Nombre completo<input id="newName"></label>
      <label>DNI / Documento<input id="newDniNum" placeholder="ej. 38123456"></label>
      <label>Fecha de Ingreso<input type="date" id="newFechaIngreso" value="${new Date().toISOString().split('T')[0]}"></label>
      <label>Puesto<input id="newJob"></label>
      <label>Sector<input id="newSector"></label>
      <label>Contacto<input id="newPhone"></label>
      <label>Correo Electrónico<input type="email" id="newEmail"></label>
      
      <label class="full">Foto de Perfil<input type="file" id="newPhoto" accept="image/*"></label>
      <label class="full">Foto del DNI (Frente / Dorso)<input type="file" id="newDniImg" accept="image/*"></label>
      <label class="full">Foto / Antecedentes Penales<input type="file" id="newAntecedentes" accept="image/*"></label>
      <label class="full">Foto / Seguro de Vida<input type="file" id="newSeguro" accept="image/*"></label>
    </div><br>
    <button class="primary" onclick="saveEmployee()">Guardar Legajo</button>`);
}

async function saveEmployee() {
  const n = document.getElementById("newName").value.trim();
  const leg = document.getElementById("newLegajoNum").value.trim();
  if (!n) return alert("Por favor, ingresá el nombre.");
  if (!leg) return alert("Por favor, asigná un número de legajo.");

  const photoFile = document.getElementById("newPhoto").files[0];
  const dniFile = document.getElementById("newDniImg").files[0];
  const antFile = document.getElementById("newAntecedentes").files[0];
  const segFile = document.getElementById("newSeguro").files[0];

  const empData = {
    id: Date.now(),
    legajo: leg,
    nombre: n,
    dniNum: document.getElementById("newDniNum").value || "-",
    fechaIngreso: document.getElementById("newFechaIngreso").value || "-",
    puesto: document.getElementById("newJob").value || "General",
    sector: document.getElementById("newSector").value || "General",
    telefono: document.getElementById("newPhone").value || "",
    email: document.getElementById("newEmail").value || "",
    foto: photoFile ? await getBase64(photoFile, 500) : "",
    fotoDni: dniFile ? await getBase64(dniFile, 800) : "",
    fotoAntecedentes: antFile ? await getBase64(antFile, 800) : "",
    fotoSeguro: segFile ? await getBase64(segFile, 800) : "",
    owner: currentUser
  };

  employees.push(empData);
  saveStorage("app_employees", employees);
  addLog(`Alta de empleado Legajo N°: ${leg} (${n})`, n);
  closeModal();
  render(current);
}

function employeeTable(limit) {
  let filtered = employees.filter(e => currentUserRole === 'admin' ? true : e.owner === currentUser);
  let arr = limit ? filtered.slice(0, limit) : filtered;

  if (arr.length === 0) return `<div class="empty">No hay empleados registrados.</div>`;
  return `<div class="table-wrap"><table class="table">
    <thead>
      <tr>
        <th>Legajo</th>
        <th>Perfil</th>
        <th>Empleado</th>
        <th>DNI / Ingreso</th>
        <th>Puesto / Sector</th>
        <th>Documentación</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody>
      ${arr.map(e => `<tr>
        <td><b>${e.legajo || 'S/L'}</b></td>
        <td>${e.foto ? `<img src="${e.foto}" style="width:38px;height:38px;border-radius:50%;object-fit:cover">` : `👤`}</td>
        <td><b>${e.nombre}</b></td>
        <td>${e.dniNum}<br><small class="muted">Ingreso: ${e.fechaIngreso}</small></td>
        <td>${e.puesto}<br><small class="muted">${e.sector}</small></td>
        <td>
          <button class="secondary" style="padding:4px 8px; font-size:12px;" onclick="verDocumentos(${e.id})">📷 Fotos</button>
          <button class="primary" style="padding:4px 8px; font-size:12px; background:#10b981;" onclick="descargarHistorialPDF(${e.id})">📄 Historial / PDF</button>
        </td>
        <td>
          <button class="secondary" style="color:red; border-color:#fca5a5" onclick="deleteEmployee(${e.id})">Eliminar</button>
        </td>
      </tr>`).join("")}
    </tbody>
  </table></div>`;
}

function verDocumentos(id) {
  const emp = employees.find(e => e.id === id);
  if (!emp) return;

  openModal(`
    <h2>Fotos y Documentos - Legajo ${emp.legajo} (${emp.nombre})</h2>
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:15px; text-align:center; margin-top:15px;">
      <div>
        <h4>Foto DNI</h4>
        ${emp.fotoDni ? `<img src="${emp.fotoDni}" style="width:100%; max-height:180px; object-fit:contain; border:1px solid #ccc; border-radius:8px;">` : '<p class="muted">Sin cargar</p>'}
      </div>
      <div>
        <h4>Antecedentes Penales</h4>
        ${emp.fotoAntecedentes ? `<img src="${emp.fotoAntecedentes}" style="width:100%; max-height:180px; object-fit:contain; border:1px solid #ccc; border-radius:8px;">` : '<p class="muted">Sin cargar</p>'}
      </div>
      <div>
        <h4>Seguro de Vida</h4>
        ${emp.fotoSeguro ? `<img src="${emp.fotoSeguro}" style="width:100%; max-height:180px; object-fit:contain; border:1px solid #ccc; border-radius:8px;">` : '<p class="muted">Sin cargar</p>'}
      </div>
    </div>
  `);
}

function deleteEmployee(id) {
  if (!checkAdminPassword()) return;
  const emp = employees.find(x => x.id === id);
  if (confirm(`¿Eliminar definitivamente el legajo de ${emp ? emp.nombre : 'este empleado'}?`)) {
    employees = employees.filter(x => x.id !== id);
    saveStorage("app_employees", employees);
    addLog(`Legajo de empleado eliminado: ${emp ? emp.nombre : id}`);
    render(current);
  }
}

// --- DESCARGA / VISTA DE HISTORIAL COMPLETO DE EMPLEADO (IMPRESIÓN / PDF) ---
function descargarHistorialPDF(id) {
  const emp = employees.find(e => e.id === id);
  if (!emp) return;
  const userConfig = loadUserConfig();

  const empAttendance = attendance.filter(a => a.empId === id);
  const empVacaciones = (records.vacaciones || []).filter(r => r.f0 === emp.nombre);

  let customRecordsHTML = "";
  Object.keys(records).forEach(cat => {
    const list = records[cat].filter(r => r.f0 === emp.nombre);
    if (list.length > 0) {
      customRecordsHTML += `<h3>${titles[cat] || cat}</h3><ul>`;
      list.forEach(item => {
        customRecordsHTML += `<li><b>${item.f3 || item.fecha || ''}:</b> ${item.f1} - Estado: ${item.f2}</li>`;
      });
      customRecordsHTML += `</ul>`;
    }
  });

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Legajo Completo - ${emp.nombre}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1, h2, h3 { color: ${userConfig.primaryColor}; }
          .header-box { display: flex; justify-content: space-between; border-bottom: 2px solid ${userConfig.primaryColor}; padding-bottom: 15px; margin-bottom: 20px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .photo-box { display: flex; gap: 10px; margin-top: 15px; }
          .photo-box img { width: 140px; height: 140px; object-fit: cover; border: 1px solid #ccc; border-radius: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f2f2f2; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <h1>${userConfig.appName}</h1>
            <h2>Historial de Legajo N°: ${emp.legajo || 'S/N'}</h2>
          </div>
          ${emp.foto ? `<img src="${emp.foto}" style="width:100px; height:100px; border-radius:50%; object-fit:cover;">` : ''}
        </div>

        <div class="grid">
          <p><b>Nombre Completo:</b> ${emp.nombre}</p>
          <p><b>DNI:</b> ${emp.dniNum}</p>
          <p><b>Fecha de Ingreso:</b> ${emp.fechaIngreso}</p>
          <p><b>Puesto:</b> ${emp.puesto}</p>
          <p><b>Sector:</b> ${emp.sector}</p>
          <p><b>Teléfono:</b> ${emp.telefono || '-'}</p>
        </div>

        <hr style="margin:20px 0;">
        <h3>Documentación Adjunta</h3>
        <div class="photo-box">
          <div><small>DNI</small><br>${emp.fotoDni ? `<img src="${emp.fotoDni}">` : 'No disponible'}</div>
          <div><small>Antecedentes Penales</small><br>${emp.fotoAntecedentes ? `<img src="${emp.fotoAntecedentes}">` : 'No disponible'}</div>
          <div><small>Seguro de Vida</small><br>${emp.fotoSeguro ? `<img src="${emp.fotoSeguro}">` : 'No disponible'}</div>
        </div>

        <hr style="margin:20px 0;">
        <h3>Historial de Vacaciones y Licencias</h3>
        ${empVacaciones.length > 0 ? `
          <table>
            <thead><tr><th>Fecha / Periodo</th><th>Detalle</th><th>Estado</th></tr></thead>
            <tbody>
              ${empVacaciones.map(v => `<tr><td>${v.f3}</td><td>${v.f1}</td><td>${v.f2}</td></tr>`).join('')}
            </tbody>
          </table>
        ` : '<p>Sin registros de vacaciones.</p>'}

        <hr style="margin:20px 0;">
        <h3>Historial de Asistencia y Fichajes GPS</h3>
        ${empAttendance.length > 0 ? `
          <table>
            <thead><tr><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Estado</th></tr></thead>
            <tbody>
              ${empAttendance.map(a => `<tr><td>${a.fecha}</td><td>${a.entrada}</td><td>${a.salida}</td><td>${a.estado}</td></tr>`).join('')}
            </tbody>
          </table>
        ` : '<p>Sin registros de asistencia.</p>'}

        <hr style="margin:20px 0;">
        ${customRecordsHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}

// --- HISTORIAL DE SISTEMA ---
function renderHistorialModule() {
  const userEmps = employees.map(e => e.nombre);
  let filterEmp = document.getElementById("histEmpFilter") ? document.getElementById("histEmpFilter").value : "TODOS";

  let userLogs = currentUserRole === 'admin' 
    ? auditLogs 
    : auditLogs.filter(l => l.owner === currentUser || l.usuario === currentUser);

  let filteredLogs = userLogs;
  if (filterEmp && filterEmp !== "TODOS") {
    filteredLogs = userLogs.filter(l => l.empleado === filterEmp);
  }

  let rows = filteredLogs.map(log => `
    <tr>
      <td>${log.fechaHora}</td>
      <td><b>${log.usuario}</b></td>
      <td><span class="badge">${log.empleado || 'General'}</span></td>
      <td>${log.accion}</td>
    </tr>`).join('');

  return `
    <div class="welcome">
      <div><h1>Historial de sistema (${currentUserRole === 'admin' ? 'Auditoría General' : 'Mis Acciones'})</h1></div>
      ${currentUserRole === 'admin' ? `<button class="secondary" style="color:red; border-color:#ef4444" onclick="limpiarHistorialAuditoria()">🗑️ Limpiar Historial (Requiere Clave Admin)</button>` : ''}
    </div>

    ${currentUserRole === 'admin' ? `
    <div class="card" style="margin-bottom:15px;">
      <label><b>Filtrar e Inspeccionar por Empleado:</b>
        <select id="histEmpFilter" onchange="render('historial')" style="margin-left:10px; padding:6px;">
          <option value="TODOS">-- Mostrar Todo el Personal --</option>
          ${userEmps.map(emp => `<option value="${emp}" ${filterEmp === emp ? 'selected' : ''}>${emp}</option>`).join('')}
        </select>
      </label>
    </div>
    ` : ''}

    <div class="card">
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Fecha y Hora</th><th>Usuario Operador</th><th>Empleado Asociado</th><th>Acción Registrada</th></tr></thead>
          <tbody>${rows.length ? rows : '<tr><td colspan="4" class="muted">No se encontraron registros en su historial.</td></tr>'}</tbody>
        </table>
      </div>
    </div>`;
}

function limpiarHistorialAuditoria() {
  if (!checkAdminPassword()) return;
  if (confirm("¿Estás seguro de vaciar completamente el registro de auditoría del sistema?")) {
    auditLogs = [{ id: Date.now(), fechaHora: new Date().toLocaleString("es-AR"), usuario: currentUser, empleado: "Sistema", accion: "Historial de auditoría reiniciado por administrador.", owner: currentUser }];
    saveStorage("app_auditLogs", auditLogs);
    render("historial");
  }
}

// --- FICHADO CON GPS ---
function openRemoteAttendanceModal(tipo) {
  const userEmps = employees.filter(e => currentUserRole === 'admin' ? true : e.owner === currentUser);
  const options = userEmps.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
  openModal(`<h2>📍 Marcar ${tipo} con GPS</h2>
    <div class="form-grid">
      <label class="full">Empleado<select id="remote_empId">${options}</select></label>
    </div><br>
    <button class="primary" style="background:${tipo === 'Entrada' ? '#10b981' : '#ef4444'};" onclick="processRemoteAttendance('${tipo}')">Fichar ${tipo} (GPS)</button>`);
}

function processRemoteAttendance(tipo) {
  const empId = parseInt(document.getElementById("remote_empId").value);
  const emp = employees.find(e => e.id === empId);

  if (!navigator.geolocation) return alert("Tu dispositivo no soporta geolocalización.");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const mapUrl = `https://www.google.com/maps?q=${lat},${lon}`;
      const horaActual = new Date().toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' });
      const hoy = new Date().toISOString().split('T')[0];

      if (tipo === 'Entrada') {
        attendance.unshift({
          id: Date.now(),
          empId: empId,
          fecha: hoy,
          entrada: horaActual,
          salida: "-",
          estado: "Presente (Entrada GPS)",
          mapUrlEntrada: mapUrl,
          mapUrlSalida: null,
          owner: currentUser
        });
      } else {
        let record = attendance.find(a => a.empId === empId && a.salida === "-");
        if (record) {
          record.salida = horaActual;
          record.mapUrlSalida = mapUrl;
          record.estado = "Jornada Finalizada (GPS)";
        } else {
          attendance.unshift({
            id: Date.now(),
            empId: empId,
            fecha: hoy,
            entrada: "-",
            salida: horaActual,
            estado: "Salida GPS Directa",
            mapUrlEntrada: null,
            mapUrlSalida: mapUrl,
            owner: currentUser
          });
        }
      }

      saveStorage("app_attendance", attendance);
      addLog(`Asistencia (${tipo}) registrada por GPS`, emp ? emp.nombre : 'General');
      alert(`¡${tipo} confirmada exitosamente con ubicación GPS!`);
      closeModal();
      render("asistencia");
    },
    (error) => alert("No se pudo obtener la ubicación GPS."),
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function attendanceTable() {
  const data = attendance.filter(a => currentUserRole === 'admin' ? true : a.owner === currentUser);
  if (data.length === 0) return `<div class="empty">No hay registros de asistencia cargados.</div>`;
  
  let rows = data.map(a => {
    const emp = employees.find(e => e.id === a.empId);
    return `<tr>
      <td>${emp && emp.foto ? `<img src="${emp.foto}" style="width:32px;height:32px;border-radius:50%;object-fit:cover">` : '👤'}</td>
      <td><b>${emp ? emp.nombre : "Sin Asignar"}</b></td>
      <td>${a.fecha}</td>
      <td>${a.entrada}</td>
      <td>${a.salida}</td>
      <td><span class="badge ${a.estado.includes('Ausente') ? 'red' : ''}">${a.estado}</span></td>
      <td>
        ${a.mapUrlEntrada ? `<a href="${a.mapUrlEntrada}" target="_blank" class="secondary" style="text-decoration:none; padding:2px 6px; font-size:11px;">📍 Mapa Entrada</a> ` : ''}
        ${a.mapUrlSalida ? `<a href="${a.mapUrlSalida}" target="_blank" class="secondary" style="text-decoration:none; padding:2px 6px; font-size:11px;">📍 Mapa Salida</a>` : ''}
      </td>
      <td><button class="secondary" style="color:red" onclick="deleteAttendance(${a.id})">Eliminar</button></td>
    </tr>`;
  }).join('');

  return `<div class="table-wrap"><table class="table">
    <thead><tr><th>Foto</th><th>Empleado</th><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Estado</th><th>GPS / Mapas</th><th>Acción</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

// --- MÓDULO VACACIONES Y AUSENCIAS ---
function renderRangoDatesModule(key, title) {
  const data = (records[key] || []).filter(item => currentUserRole === 'admin' ? true : item.owner === currentUser);
  let tableHTML = `<div class="card empty">No hay registros cargados.</div>`;
  if (data.length > 0) {
    tableHTML = `<div class="card"><div class="table-wrap"><table class="table">
      <thead><tr><th>Empleado</th><th>Detalle / Motivo</th><th>Estado</th><th>Fecha Desde</th><th>Fecha Hasta</th><th>Comprobante / Foto</th><th>Acción</th></tr></thead>
      <tbody>
        ${data.map(item => `<tr>
          <td><b>${item.f0}</b></td>
          <td>${item.f1}</td>
          <td>${item.f2}</td>
          <td>${item.f3}</td>
          <td>${item.f4 || '-'}</td>
          <td>
            ${item.fotoDoc ? `<button class="secondary" style="padding:4px 8px; font-size:12px;" onclick="verFotoRegistro('${item.fotoDoc}')">📷 Ver Foto/Doc</button>` : '<span class="muted">Sin Foto</span>'}
          </td>
          <td><button class="secondary" style="color:red" onclick="deleteRecord('${key}', ${item.id})">Eliminar</button></td>
        </tr>`).join('')}
      </tbody>
    </table></div></div>`;
  }
  return `<div class="welcome"><div><h1>${title}</h1></div><button class="primary" onclick="openRangoModal('${key}', 'Registrar ${title}')">+ Nuevo registro</button></div>${tableHTML}`;
}

function openRangoModal(key, title) {
  const userEmps = employees.filter(e => currentUserRole === 'admin' ? true : e.owner === currentUser);
  const options = userEmps.map(e => `<option value="${e.nombre}">${e.nombre}</option>`).join('');
  const hoy = new Date().toISOString().split('T')[0];

  openModal(`<h2>${title}</h2>
    <div class="form-grid">
      <label class="full">Empleado<select id="gen_0">${options}</select></label>
      <label>Detalle / Motivo<input id="gen_1" placeholder="ej. Vacaciones Anuales / Licencia Médica"></label>
      <label>Estado<input id="gen_2" placeholder="ej. Aprobado / En revisión"></label>
      <label>Fecha Desde<input type="date" id="gen_3" value="${hoy}"></label>
      <label>Fecha Hasta<input type="date" id="gen_4" value="${hoy}"></label>
      <label class="full">Foto / Comprobante de respaldo<input type="file" id="gen_foto" accept="image/*"></label>
    </div><br>
    <button class="primary" onclick="saveRecordRango('${key}')">Guardar Registro</button>`);
}

async function saveRecordRango(key) {
  if (!records[key]) records[key] = [];
  const empNombre = document.getElementById("gen_0").value;
  const fotoFile = document.getElementById("gen_foto").files[0];

  records[key].push({
    id: Date.now(),
    f0: empNombre,
    f1: document.getElementById("gen_1").value,
    f2: document.getElementById("gen_2").value,
    f3: document.getElementById("gen_3").value,
    f4: document.getElementById("gen_4").value,
    fotoDoc: fotoFile ? await getBase64(fotoFile, 800) : "",
    owner: currentUser
  });

  saveStorage("app_records", records);
  addLog(`Nuevo registro en ${titles[key] || key}`, empNombre);
  closeModal();
  render(current);
}

// --- MÓDULOS GENÉRICOS ---
function renderCustomModule(key, title, headers, modalFn) {
  const data = (records[key] || []).filter(item => currentUserRole === 'admin' ? true : item.owner === currentUser);
  let tableHTML = `<div class="card empty">No hay registros cargados.</div>`;
  if (data.length > 0) {
    tableHTML = `<div class="card"><div class="table-wrap"><table class="table">
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}<th>Acción</th></tr></thead>
      <tbody>
        ${data.map(item => `<tr>
          <td><b>${item.f0}</b></td>
          <td>${item.f1}</td>
          <td>${item.f2}</td>
          <td>${item.f3}</td>
          <td>
            ${item.fotoDoc ? `<button class="secondary" style="padding:4px 8px; font-size:12px;" onclick="verFotoRegistro('${item.fotoDoc}')">📷 Ver Foto/Doc</button>` : '<span class="muted">Sin Foto</span>'}
          </td>
          <td><button class="secondary" style="color:red" onclick="deleteRecord('${key}', ${item.id})">Eliminar</button></td>
        </tr>`).join('')}
      </tbody>
    </table></div></div>`;
  }
  return `<div class="welcome"><div><h1>${title}</h1></div><button class="primary" onclick="${modalFn}">+ Nuevo registro</button></div>${tableHTML}`;
}

function openGenericModal(key, title) {
  const userEmps = employees.filter(e => currentUserRole === 'admin' ? true : e.owner === currentUser);
  const options = userEmps.map(e => `<option value="${e.nombre}">${e.nombre}</option>`).join('');
  openModal(`<h2>${title}</h2>
    <div class="form-grid">
      <label>Empleado / Referencia<select id="gen_0">${options}</select></label>
      <label>Detalle Principal<input id="gen_1"></label>
      <label>Estado / Resultado<input id="gen_2"></label>
      <label>Fecha / Inicio<input type="date" id="gen_3" value="${new Date().toISOString().split('T')[0]}"></label>
      <label class="full">Foto / Comprobante de respaldo<input type="file" id="gen_foto" accept="image/*"></label>
    </div><br>
    <button class="primary" onclick="saveRecordGeneric('${key}')">Guardar Registro</button>`);
}

async function saveRecordGeneric(key) {
  if (!records[key]) records[key] = [];
  const empNombre = document.getElementById("gen_0").value;
  const fotoFile = document.getElementById("gen_foto").files[0];

  records[key].push({
    id: Date.now(),
    f0: empNombre,
    f1: document.getElementById("gen_1").value,
    f2: document.getElementById("gen_2").value,
    f3: document.getElementById("gen_3").value,
    fotoDoc: fotoFile ? await getBase64(fotoFile, 800) : "",
    owner: currentUser
  });

  saveStorage("app_records", records);
  addLog(`Nuevo registro en ${titles[key] || key}`, empNombre);
  closeModal();
  render(current);
}

function verFotoRegistro(base64Image) {
  openModal(`
    <h2>Comprobante / Documento Adjunto</h2>
    <div style="text-align:center; padding:10px;">
      <img src="${base64Image}" style="max-width:100%; max-height:400px; border-radius:8px; border:1px solid #ccc;">
    </div>
  `);
}

function deleteRecord(key, id) {
  if (!checkAdminPassword()) return;
  if (confirm("¿Deseas eliminar este registro?")) {
    records[key] = records[key].filter(r => r.id !== id);
    saveStorage("app_records", records);
    render(current);
  }
}

function deleteAttendance(id) {
  if (!checkAdminPassword()) return;
  if (confirm("¿Deseas eliminar esta asistencia?")) {
    attendance = attendance.filter(a => a.id !== id);
    saveStorage("app_attendance", attendance);
    render("asistencia");
  }
}

function openCreateUserModal() {
  openModal(`<h2>Crear Nueva Cuenta</h2>
    <div class="form-grid">
      <label>Usuario<input id="usr_user"></label>
      <label>Contraseña<input type="password" id="usr_pass"></label>
      <label>Nombre Completo<input id="usr_nombre"></label>
      <label>Rol
        <select id="usr_role">
          <option value="usuario">Usuario Normal</option>
          <option value="admin">Administrador</option>
        </select>
      </label>
    </div><br>
    <button class="primary" onclick="saveNewUser()">Crear Cuenta</button>`);
}

function saveNewUser() {
  const u = document.getElementById("usr_user").value.trim();
  const p = document.getElementById("usr_pass").value.trim();
  const n = document.getElementById("usr_nombre").value.trim() || u;
  const r = document.getElementById("usr_role").value;

  if (!u || !p) return alert("Por favor complete usuario y contraseña.");

  users.push({ user: u, pass: p, role: r, nombre: n, email: "", whatsapp: "" });
  saveStorage("app_users", users);
  addLog(`Cuenta creada: ${u}`);
  closeModal();
  render("config");
}

function deleteUser(index) {
  if (!checkAdminPassword()) return;
  if (confirm("¿Deseas eliminar esta cuenta de usuario?")) {
    users.splice(index, 1);
    saveStorage("app_users", users);
    render("config");
  }
}

function openModal(body) {
  const mBody = document.getElementById("modalBody");
  const modal = document.getElementById("modal");
  if (mBody && modal) { mBody.innerHTML = body; modal.classList.remove("hidden"); }
}

function closeModal() {
  const modal = document.getElementById("modal");
  if (modal) modal.classList.add("hidden");
}

function filterEmployees() {
  const q = document.getElementById("empSearch").value.toLowerCase();
  document.querySelectorAll("#empTable tbody tr").forEach(r => {
    r.style.display = r.innerText.toLowerCase().includes(q) ? "" : "none";
  });
}
