// ── CONFIGURACIÓN SUPABASE ──
const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_KEY = 'TU_ANON_KEY';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── ESTADO GLOBAL ──
let currentUser = null;
let items = [];
let activeConvId = null;
let userLoc = null;
const CATEGORIES = [
  {id:'tech', label:'Tecnología', icon:'💻', color:'var(--c-tech)'},
  {id:'home', label:'Hogar', icon:'🏠', color:'var(--c-home)'},
  {id:'fash', label:'Moda', icon:'👕', color:'var(--c-fash)'},
  {id:'spor', label:'Deporte', icon:'⚽', color:'var(--c-spor)'},
  {id:'serv', label:'Servicios', icon:'🛠️', color:'var(--c-serv)'},
  {id:'other', label:'Otros', icon:'📦', color:'var(--c-other)'}
];

// ── INICIALIZACIÓN ──
document.addEventListener('DOMContentLoaded', async () => {
    initCategoryPills();
    checkSession();
    
    // Listener de scroll para efectos visuales
    document.getElementById('app-scroll').onscroll = function() {
        const nav = document.getElementById('main-nav');
        if(this.scrollTop > 20) nav.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
        else nav.style.boxShadow = 'none';
    };
});

// ── NAVEGACIÓN ──
function navTo(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view-' + view);
    if(target) target.classList.add('active');

    // Reset scroll
    document.getElementById('app-scroll').scrollTop = 0;

    // UI Updates
    document.querySelectorAll('.nav-tab, .bnav-btn').forEach(b => b.classList.remove('active'));
    const nTab = document.getElementById('ntab-' + view);
    const bTab = document.getElementById('btab-' + view);
    if(nTab) nTab.classList.add('active');
    if(bTab) bTab.classList.add('active');

    if(view === 'explore') loadItems();
    if(view === 'messages') loadConversations();
    if(view === 'profile') loadProfile();
}

// ── LÓGICA DE SUPABASE ──
async function checkSession() {
    const { data } = await db.auth.getSession();
    if (data.session) {
        currentUser = data.session.user;
        const { data: prof } = await db.from('profiles').select('*').eq('id', currentUser.id).single();
        if (prof && prof.full_name) {
            document.getElementById('main-nav').style.display = 'flex';
            navTo('explore');
        } else {
            navTo('onboarding');
        }
    } else {
        navTo('landing');
    }
}

async function handleAuth() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    const btn = document.getElementById('auth-submit-btn');
    
    if(!email || !pass) return showToast("Completa los datos", "orange");
    
    btn.disabled = true;
    btn.innerText = "Procesando...";

    // Intento de Login
    const { data, error } = await db.auth.signInWithPassword({ email, password: pass });
    
    if (error) {
        // Si falla, intentamos registro
        const { error: regErr } = await db.auth.signUp({ email, password: pass });
        if (regErr) {
            showToast(regErr.message, "red");
            btn.disabled = false;
            btn.innerText = "Entrar / Registrarse";
        } else {
            showToast("Cuenta creada. ¡Bienvenido!", "green");
            setTimeout(() => location.reload(), 1500);
        }
    } else {
        location.reload();
    }
}

// ── PUBLICACIÓN Y OBJETOS ──
async function loadItems() {
    let { data, error } = await db.from('items').select('*, profiles(full_name, avatar_url)').order('created_at', {ascending:false});
    if(data) {
        items = data;
        renderGrid(items, 'items-grid');
    }
}

function renderGrid(list, containerId) {
    const grid = document.getElementById(containerId);
    grid.innerHTML = list.map(item => `
        <div class="item-card" onclick="viewItem('${item.id}')">
            <img src="${item.image_url || 'https://via.placeholder.com/300'}" class="item-img" alt="${item.title}">
            <div class="item-info">
                <span class="item-cat" style="color:${getCatColor(item.category)}">${getCatLabel(item.category)}</span>
                <div class="item-title">${item.title}</div>
                <div class="item-dist">📍 ${item.location_name || 'Cerca de ti'}</div>
            </div>
        </div>
    `).join('');
}

// ── FUNCIONES AUXILIARES ──
function getCatColor(id) { return CATEGORIES.find(c => c.id === id)?.color || '#666'; }
function getCatLabel(id) { return CATEGORIES.find(c => c.id === id)?.label || 'Otros'; }

function showToast(msg, color = "accent") {
    const t = document.createElement('div');
    t.className = 'toast';
    t.style.background = `var(--${color})`;
    t.innerText = msg;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// Inicialización de categorías en el UI
function initCategoryPills() {
    const container = document.getElementById('cat-pills');
    const select = document.getElementById('pub-cat');
    
    CATEGORIES.forEach(cat => {
        // Pills de filtro
        const btn = document.createElement('button');
        btn.className = 'pill';
        btn.innerText = cat.icon + ' ' + cat.label;
        btn.onclick = () => filterCat(cat.id);
        container.appendChild(btn);
        
        // Options del selector de publicar
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.innerText = cat.label;
        select.appendChild(opt);
    });
}

// (Aquí seguirían el resto de funciones del archivo original: filterCat, viewItem, sendMessage, etc.)
// Nota: Por brevedad en la respuesta he incluido el núcleo. Debes copiar el resto de funciones del <script> original aquí.