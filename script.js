/**
 * =============================================================================
 * APORTE INTELIGENTE — v2 | Frontend / Lógica da Aplicação (Firebase)
 * =============================================================================
 * Este ficheiro contém toda a lógica da aplicação, incluindo a integração
 * com a nuvem (Google Firebase Firestore) para guardar os dados em tempo real.
 * =============================================================================
 */

// ========== VARIÁVEIS GLOBAIS ==========
let idEdicaoAporte = null;
let idEdicaoDividendo = null;
let todasOcultas = false;

// ========== PALETA DE CORES ==========
const paletaCores = ['#001435', '#FDB913', '#1e88e5', '#43a047', '#e53935', '#fb8c00', '#8e24aa', '#3949ab', '#00acc1', '#7cb342'];

// ========== 1. IMPORTAÇÕES DO FIREBASE ==========
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ========== 2. AS SUAS CHAVES DO FIREBASE (SUBSTITUA AQUI) ==========
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCdX34pNmEcLoi3PXL0Rlfn7sIDuMEVYbI",
    authDomain: "aporte-inteligente.firebaseapp.com",
    projectId: "aporte-inteligente",
    storageBucket: "aporte-inteligente.firebasestorage.app",
    messagingSenderId: "1036424237394",
    appId: "1:1036424237394:web:b339723191b9920703ea8b",
    measurementId: "G-PRP52LZ9MH"
};

// ========== 3. INICIALIZAÇÃO DA NUVEM ==========
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appIdStr = "aporte-inteligente-v2";
let currentUser = null;

// ========== 4. SEU TOKEN DA BOLSA (BRAPI) ==========


// ========== 5. GERENCIADOR DE DADOS (NUVEM) ==========
class GerenciadorDadosNuvem {
    constructor(colecao) {
        this.colecao = colecao;
        this.dados = [];
        this.onUpdate = null;
    }
    iniciarListener() {
        if (!currentUser) return;
        const colRef = collection(db, 'artifacts', appIdStr, 'users', currentUser.uid, this.colecao);
        onSnapshot(colRef, (snapshot) => {
            this.dados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            if (this.onUpdate) this.onUpdate();
        }, (error) => console.error(`Erro ao ler ${this.colecao}:`, error));
    }
    obterTodos() { return this.dados; }
    async adicionar(item, forceId = null) {
        if (!currentUser) return;
        const docId = forceId ? forceId.toString() : (Date.now().toString() + Math.random().toString().substring(2, 5));
        item.id = docId;
        await setDoc(doc(db, 'artifacts', appIdStr, 'users', currentUser.uid, this.colecao, docId), item);
    }
    async atualizar(id, item) {
        if (!currentUser) return;
        item.id = id.toString();
        await setDoc(doc(db, 'artifacts', appIdStr, 'users', currentUser.uid, this.colecao, id.toString()), item, { merge: true });
    }
    async remover(id) {
        if (!currentUser) return;
        await deleteDoc(doc(db, 'artifacts', appIdStr, 'users', currentUser.uid, this.colecao, id.toString()));
    }
}

const gAportes = new GerenciadorDadosNuvem('aportes');
const gDividendos = new GerenciadorDadosNuvem('dividendos');
const gRadar = new GerenciadorDadosNuvem('radar');

// ========== 6. AUTENTICAÇÃO E MIGRAÇÃO ==========
signInAnonymously(auth).catch((error) => console.error("Erro no Auth Anônimo:", error));

onAuthStateChanged(auth, async (user) => {
    const ind = document.getElementById('cloud-indicator');
    const txt = document.getElementById('cloud-text');
    if (user) {
        currentUser = user;
        if (ind) ind.classList.add('online');
        if (txt) txt.textContent = "Sincronizado na Nuvem";

        await migrarDadosLocais();

        gAportes.onUpdate = atualizarInterface;
        gDividendos.onUpdate = atualizarInterface;
        gRadar.onUpdate = atualizarRadar;

        gAportes.iniciarListener();
        gDividendos.iniciarListener();
        gRadar.iniciarListener();
    } else {
        currentUser = null;
        if (ind) ind.classList.remove('online');
        if (txt) txt.textContent = "Desconectado";
    }
});

async function migrarDadosLocais() {
    const migrado = localStorage.getItem('migracao_firebase_v2');
    if (migrado) return;

    const apLocal = JSON.parse(localStorage.getItem('mercadoBolsaBR_aportes')) || [];
    const divLocal = JSON.parse(localStorage.getItem('mercadoBolsaBR_dividendos')) || [];
    const radLocal = JSON.parse(localStorage.getItem('aporteInteligente_radar')) || [];

    if (apLocal.length > 0 || divLocal.length > 0 || radLocal.length > 0) {
        window.mostrarAlerta('A sincronizar os seus dados antigos com a nuvem...', 'aviso');
        for (const a of apLocal) await gAportes.adicionar(a, a.id);
        for (const d of divLocal) await gDividendos.adicionar(d, d.id);
        for (const r of radLocal) await setDoc(doc(db, 'artifacts', appIdStr, 'users', currentUser.uid, 'radar', r.codigo), r);

        localStorage.setItem('migracao_firebase_v2', 'true');
        window.mostrarAlerta('Dados guardados na Nuvem com sucesso!', 'success');
    }
}

// ========== 7. FUNÇÕES GLOBAIS (UX / UI) ==========
window.mostrarAlerta = function (msg, tipo = 'success') {
    const box = document.getElementById('alertaBox');
    if (!box) return;
    box.textContent = msg;
    box.style.backgroundColor = tipo === 'success' ? 'var(--cor-sucesso)' : (tipo === 'aviso' ? 'var(--cor-aviso)' : 'var(--cor-erro)');
    box.style.display = 'block';
    setTimeout(() => box.style.display = 'none', 3500);
};

window.toggleSecao = function (botao) {
    const conteudo = botao.parentElement.nextElementSibling;
    if (conteudo.style.display === 'none') { conteudo.style.display = 'block'; botao.textContent = '➖'; }
    else { conteudo.style.display = 'none'; botao.textContent = '➕'; }
};

window.toggleTodasSecoes = function () {
    todasOcultas = !todasOcultas;
    document.querySelectorAll('section.card, .summary-container').forEach(secao => {
        const botao = secao.querySelector('button[onclick*="toggleSecao"]');
        const header = secao.querySelector('.card-header-flex') || secao.querySelector('div[style*="flex"]');
        const conteudo = secao.querySelector('.conteudo-secao') || (header ? header.nextElementSibling : null);
        if (conteudo && conteudo.tagName === 'DIV') conteudo.style.display = todasOcultas ? 'none' : 'block';
        if (botao) botao.textContent = todasOcultas ? '➕' : '➖';
    });
};

window.copiarGrafico = async function (canvasId) {
    try {
        const card = document.getElementById(canvasId).closest('.chart-wrapper');
        const btn = card.querySelector('button');
        btn.style.display = 'none';
        const canvasGerado = await html2canvas(card, { backgroundColor: '#ffffff', scale: 2 });
        btn.style.display = 'block';
        canvasGerado.toBlob(async (blob) => {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            window.mostrarAlerta('Gráfico copiado!', 'success');
        });
    } catch (e) { window.mostrarAlerta('Erro ao copiar.', 'erro'); }
};

// ========== 8. API BRAPI (Via Backend Seguro) ==========
async function buscarCotacaoReal(codigo) {
    try {
        // Agora ele pede a cotação ao SEU servidor no Vercel, e não à Brapi diretamente
        const res = await fetch(`/api/quote?codigo=${codigo}`);
        const data = await res.json();
        return data.results?.[0]?.regularMarketPrice || null;
    } catch (e) {
        return null;
    }
}


