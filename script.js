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
    
    // Limpa classes anteriores e define a nova
    box.className = 'alerta ' + tipo;
    box.textContent = msg;
    box.style.display = 'block';
    
    // Esconde após 3.5 segundos
    if (window.alertaTimeout) clearTimeout(window.alertaTimeout);
    window.alertaTimeout = setTimeout(() => {
        box.style.display = 'none';
    }, 3500);
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

// ========== CORREÇÃO: copiarGrafico Completo ==========
// Agora utiliza o html2canvas (incluído no index.html via CDN) para capturar o card todo (título + gráfico).
// Isso resolve o problema de copiar apenas as colunas/barras.
window.copiarGrafico = async function (canvasId) {
    const canvasElement = document.getElementById(canvasId);
    if (!canvasElement) {
        window.mostrarAlerta('Gráfico não encontrado.', 'erro');
        return;
    }

    const card = canvasElement.closest('.chart-card') || canvasElement.parentElement;
    const btnCopia = card.querySelector('.btn-copy-chart');

    // Oculte o botão "Copiar" temporariamente para ele não aparecer na imagem capturada
    if (btnCopia) btnCopia.style.visibility = 'hidden';

    try {
        // Captura o card inteiro usando html2canvas
        const canvasResult = await html2canvas(card, {
            scale: 2, // Aumenta a resolução para ficar nítido
            backgroundColor: '#ffffff', // Garante fundo branco (mesmo que o CSS mude)
            logging: false,
            useCORS: true
        });

        // Tenta copiar para a Área de Transferência (Clipboard API)
        if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
            const blob = await new Promise(resolve => canvasResult.toBlob(resolve, 'image/png'));
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            window.mostrarAlerta('Card completo copiado (título + gráfico)!', 'success');
            
            // Feedback visual no próprio botão
            if (btnCopia) {
                const textoOriginal = btnCopia.innerHTML;
                btnCopia.innerHTML = '✅ Copiado!';
                btnCopia.classList.add('btn-sucesso-temp');
                setTimeout(() => {
                    btnCopia.innerHTML = textoOriginal;
                    btnCopia.classList.remove('btn-sucesso-temp');
                }, 2000);
            }
        } else {
            // Fallback: Download da imagem caso o browser seja antigo ou não esteja em HTTPS
            const link = document.createElement('a');
            link.download = `grafico_${canvasId}.png`;
            link.href = canvasResult.toDataURL('image/png');
            link.click();
            window.mostrarAlerta('Imagem guardada! (Browser não suporta cópia direta de imagem)', 'aviso');
        }
    } catch (e) {
        console.error('Erro ao capturar card com html2canvas:', e);
        window.mostrarAlerta('Não foi possível capturar o card completo.', 'erro');
    } finally {
        // Devolve a visibilidade ao botão após o processo
        if (btnCopia) btnCopia.style.visibility = 'visible';
    }
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



// ========== 9. FUNÇÕES DE EXPORTAÇÃO / IMPORTAÇÃO / MODELO ==========

function exportarCSV(dados, colunas, nomeArquivo) {
    if (!dados || dados.length === 0) {
        window.mostrarAlerta('Nenhum dado para exportar.', 'aviso');
        return;
    }
    const header = colunas.join(';');
    const linhas = dados.map(item => colunas.map(c => {
        const val = item[c] !== undefined ? item[c] : '';
        return `"${String(val).replace(/"/g, '""')}"`;
    }).join(';'));
    const csvContent = [header, ...linhas].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
}

function baixarModelo(colunas, nomeArquivo) {
    const csvContent = colunas.join(';') + '\n';
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
}

async function importarCSV(file, colunas, gerenciador, transformar) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result.replace(/^\uFEFF/, '');
                const linhas = text.split('\n').filter(l => l.trim() !== '');
                const header = linhas[0].split(';').map(h => h.trim().replace(/"/g, ''));
                let importados = 0;
                for (let i = 1; i < linhas.length; i++) {
                    const valores = linhas[i].split(';').map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
                    const obj = {};
                    header.forEach((col, idx) => { obj[col] = valores[idx] || ''; });
                    const item = transformar ? transformar(obj) : obj;
                    if (item) { await gerenciador.adicionar(item); importados++; }
                }
                resolve(importados);
            } catch (err) { reject(err); }
        };
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
    });
}

// ========== 10. RENDERIZAÇÃO DAS TABELAS ==========

function renderizarTabelaAportes(aportes) {
    const container = document.getElementById('tabelaContainer');
    if (!container) return;
    if (!aportes || aportes.length === 0) {
        container.innerHTML = '<p style="color:#888;padding:1rem 0;">Nenhuma operação registada.</p>';
        return;
    }
    const ordenados = [...aportes].sort((a, b) => new Date(b.data || b.dataAporte || 0) - new Date(a.data || a.dataAporte || 0));
    container.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
            <thead>
                <tr style="background:#f5f5f5;">
                    <th style="padding:8px;text-align:left;border-bottom:2px solid #ddd;">Ativo</th>
                    <th style="padding:8px;text-align:left;border-bottom:2px solid #ddd;">Setor</th>
                    <th style="padding:8px;text-align:right;border-bottom:2px solid #ddd;">Qtd</th>
                    <th style="padding:8px;text-align:right;border-bottom:2px solid #ddd;">Preço Pago</th>
                    <th style="padding:8px;text-align:right;border-bottom:2px solid #ddd;">Total</th>
                    <th style="padding:8px;text-align:center;border-bottom:2px solid #ddd;">Data</th>
                    <th style="padding:8px;text-align:center;border-bottom:2px solid #ddd;">Nota</th>
                    <th style="padding:8px;text-align:center;border-bottom:2px solid #ddd;">Ações</th>
                </tr>
            </thead>
            <tbody>
                ${ordenados.map(a => {
        const qtd = parseFloat(a.quantidade || a.qtd || 0);
        const preco = parseFloat(a.preco || a.precoPago || a.precoUnitario || 0);
        const total = qtd * preco;
        const data = a.data || a.dataAporte || a.dataCompra || '';
        const dataFmt = data ? new Date(data + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
        const nota = a.nota || a.notaCorretagem || '';
        return `<tr style="border-bottom:1px solid #eee;">
                        <td style="padding:8px;font-weight:600;">${a.codigo || a.ativo || ''}</td>
                        <td style="padding:8px;">${a.setor || '-'}</td>
                        <td style="padding:8px;text-align:right;">${qtd.toLocaleString('pt-BR')}</td>
                        <td style="padding:8px;text-align:right;">R$ ${preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style="padding:8px;text-align:right;">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style="padding:8px;text-align:center;">${dataFmt}</td>
                        <td style="padding:8px;text-align:center;">${nota ? `<a href="${nota}" target="_blank" rel="noopener noreferrer" style="color:#1e88e5;">🔗</a>` : '-'}</td>
                        <td style="padding:8px;text-align:center;">
                            <button onclick="window.editarAporte('${a.id}')" style="background:#1e88e5;color:white;border:none;border-radius:4px;padding:3px 8px;cursor:pointer;margin-right:4px;font-size:0.8rem;">✏️</button>
                            <button onclick="window.removerAporte('${a.id}')" style="background:#e53935;color:white;border:none;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:0.8rem;">🗑️</button>
                        </td>
                    </tr>`;
    }).join('')}
            </tbody>
        </table>`;
}

function renderizarTabelaDividendos(dividendos) {
    const container = document.getElementById('tabelaDividendosContainer');
    if (!container) return;
    if (!dividendos || dividendos.length === 0) {
        container.innerHTML = '<p style="color:#888;padding:1rem 0;">Nenhum dividendo registado.</p>';
        return;
    }
    const ordenados = [...dividendos].sort((a, b) => new Date(b.data || b.dataPagamento || 0) - new Date(a.data || a.dataPagamento || 0));
    container.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
            <thead>
                <tr style="background:#f5f5f5;">
                    <th style="padding:8px;text-align:left;border-bottom:2px solid #ddd;">Ativo</th>
                    <th style="padding:8px;text-align:right;border-bottom:2px solid #ddd;">Valor</th>
                    <th style="padding:8px;text-align:center;border-bottom:2px solid #ddd;">Data Pagamento</th>
                    <th style="padding:8px;text-align:left;border-bottom:2px solid #ddd;">Descrição</th>
                    <th style="padding:8px;text-align:center;border-bottom:2px solid #ddd;">Ações</th>
                </tr>
            </thead>
            <tbody>
                ${ordenados.map(d => {
        const valor = parseFloat(d.valor || d.valorRecebido || 0);
        const data = d.data || d.dataPagamento || '';
        const dataFmt = data ? new Date(data + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
        return `<tr style="border-bottom:1px solid #eee;">
                        <td style="padding:8px;font-weight:600;">${d.codigo || d.ativo || ''}</td>
                        <td style="padding:8px;text-align:right;">R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style="padding:8px;text-align:center;">${dataFmt}</td>
                        <td style="padding:8px;">${d.descricao || '-'}</td>
                        <td style="padding:8px;text-align:center;">
                            <button onclick="window.editarDividendo('${d.id}')" style="background:#1e88e5;color:white;border:none;border-radius:4px;padding:3px 8px;cursor:pointer;margin-right:4px;font-size:0.8rem;">✏️</button>
                            <button onclick="window.removerDividendo('${d.id}')" style="background:#e53935;color:white;border:none;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:0.8rem;">🗑️</button>
                        </td>
                    </tr>`;
    }).join('')}
            </tbody>
        </table>`;
}

function renderizarCarteiraConsolidada(aportes) {
    const container = document.getElementById('tabelaCarteiraContainer');
    if (!container) return;
    if (!aportes || aportes.length === 0) {
        container.innerHTML = '<p style="color:#888;padding:1rem 0;">Nenhum ativo na carteira.</p>';
        return;
    }
    const mapa = {};
    aportes.forEach(a => {
        const codigo = (a.codigo || a.ativo || '').toUpperCase();
        if (!codigo) return;
        if (!mapa[codigo]) mapa[codigo] = { codigo, setor: a.setor || '-', qtd: 0, totalInvestido: 0 };
        const qtd = parseFloat(a.quantidade || a.qtd || 0);
        const preco = parseFloat(a.preco || a.precoPago || a.precoUnitario || 0);
        mapa[codigo].qtd += qtd;
        mapa[codigo].totalInvestido += qtd * preco;
    });
    const ativos = Object.values(mapa).sort((a, b) => b.totalInvestido - a.totalInvestido);
    const totalGeral = ativos.reduce((s, a) => s + a.totalInvestido, 0);
    container.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
            <thead>
                <tr style="background:#f5f5f5;">
                    <th style="padding:8px;text-align:left;border-bottom:2px solid #ddd;">Ativo</th>
                    <th style="padding:8px;text-align:left;border-bottom:2px solid #ddd;">Setor</th>
                    <th style="padding:8px;text-align:right;border-bottom:2px solid #ddd;">Qtd Total</th>
                    <th style="padding:8px;text-align:right;border-bottom:2px solid #ddd;">Preço Médio</th>
                    <th style="padding:8px;text-align:right;border-bottom:2px solid #ddd;">Total Investido</th>
                    <th style="padding:8px;text-align:right;border-bottom:2px solid #ddd;">% Carteira</th>
                </tr>
            </thead>
            <tbody>
                ${ativos.map(a => {
        const pm = a.qtd > 0 ? a.totalInvestido / a.qtd : 0;
        const pct = totalGeral > 0 ? (a.totalInvestido / totalGeral * 100) : 0;
        return `<tr style="border-bottom:1px solid #eee;">
                        <td style="padding:8px;font-weight:600;">${a.codigo}</td>
                        <td style="padding:8px;">${a.setor}</td>
                        <td style="padding:8px;text-align:right;">${a.qtd.toLocaleString('pt-BR')}</td>
                        <td style="padding:8px;text-align:right;">R$ ${pm.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style="padding:8px;text-align:right;">R$ ${a.totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td style="padding:8px;text-align:right;">${pct.toFixed(1)}%</td>
                    </tr>`;
    }).join('')}
            </tbody>
        </table>`;
}

// ========== 11. GRÁFICOS ==========

let charts = {};

function destruirGrafico(id) {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function renderizarGraficos(aportes, dividendos) {
    renderizarGraficoComposicao(aportes);
    renderizarGraficoValores(aportes);
    renderizarGraficoSetor(aportes);
    renderizarGraficoDividendos(dividendos);
}

function renderizarGraficoComposicao(aportes) {
    destruirGrafico('chartComposicao');
    const ctx = document.getElementById('chartComposicao');
    if (!ctx) return;
    if (!aportes || aportes.length === 0) return;
    const mapa = {};
    aportes.forEach(a => {
        const cod = (a.codigo || a.ativo || '').toUpperCase();
        if (!cod) return;
        const total = parseFloat(a.quantidade || a.qtd || 0) * parseFloat(a.preco || a.precoPago || 0);
        mapa[cod] = (mapa[cod] || 0) + total;
    });
    const labels = Object.keys(mapa);
    const valores = Object.values(mapa);
    charts['chartComposicao'] = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: valores, backgroundColor: paletaCores.slice(0, labels.length), borderWidth: 2 }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

function renderizarGraficoValores(aportes) {
    destruirGrafico('chartValores');
    const ctx = document.getElementById('chartValores');
    if (!ctx) return;
    if (!aportes || aportes.length === 0) return;
    const mapa = {};
    aportes.forEach(a => {
        const cod = (a.codigo || a.ativo || '').toUpperCase();
        if (!cod) return;
        const total = parseFloat(a.quantidade || a.qtd || 0) * parseFloat(a.preco || a.precoPago || 0);
        mapa[cod] = (mapa[cod] || 0) + total;
    });
    const sorted = Object.entries(mapa).sort((a, b) => b[1] - a[1]);
    charts['chartValores'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(e => e[0]),
            datasets: [{ label: 'Total Investido (R$)', data: sorted.map(e => e[1]), backgroundColor: paletaCores.slice(0, sorted.length) }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => 'R$ ' + v.toLocaleString('pt-BR') } } } }
    });
}

function renderizarGraficoSetor(aportes) {
    destruirGrafico('graficoSetor');
    const ctx = document.getElementById('graficoSetor');
    if (!ctx) return;
    if (!aportes || aportes.length === 0) return;
    const mapa = {};
    aportes.forEach(a => {
        const setor = a.setor || 'Outros';
        const total = parseFloat(a.quantidade || a.qtd || 0) * parseFloat(a.preco || a.precoPago || 0);
        mapa[setor] = (mapa[setor] || 0) + total;
    });
    const labels = Object.keys(mapa);
    charts['graficoSetor'] = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: Object.values(mapa), backgroundColor: paletaCores.slice(0, labels.length), borderWidth: 2 }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

function renderizarGraficoDividendos(dividendos) {
    destruirGrafico('graficoDividendos');
    const ctx = document.getElementById('graficoDividendos');
    if (!ctx) return;
    if (!dividendos || dividendos.length === 0) return;
    const mapa = {};
    dividendos.forEach(d => {
        const data = d.data || d.dataPagamento || '';
        if (!data) return;
        const mes = data.substring(0, 7);
        mapa[mes] = (mapa[mes] || 0) + parseFloat(d.valor || d.valorRecebido || 0);
    });
    const labels = Object.keys(mapa).sort();
    charts['graficoDividendos'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(l => { const [y, m] = l.split('-'); return `${m}/${y}`; }),
            datasets: [{ label: 'Dividendos (R$)', data: labels.map(l => mapa[l]), backgroundColor: '#43a047' }]
        },
        options: { responsive: true, scales: { y: { ticks: { callback: v => 'R$ ' + v.toLocaleString('pt-BR') } } } }
    });
}

// ========== 12. RESUMO (KPIs) ==========

function atualizarResumo(aportes, dividendos) {
    const totalInvestido = (aportes || []).reduce((s, a) => {
        return s + parseFloat(a.quantidade || a.qtd || 0) * parseFloat(a.preco || a.precoPago || 0);
    }, 0);
    const totalDividendos = (dividendos || []).reduce((s, d) => s + parseFloat(d.valor || d.valorRecebido || 0), 0);
    const retorno = totalInvestido > 0 ? (totalDividendos / totalInvestido * 100) : 0;

    const elInv = document.getElementById('resumoInvestido');
    const elDiv = document.getElementById('resumoDividendos');
    const elRet = document.getElementById('resumoRetorno');
    if (elInv) elInv.textContent = 'R$ ' + totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (elDiv) elDiv.textContent = 'R$ ' + totalDividendos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (elRet) elRet.textContent = retorno.toFixed(2).replace('.', ',') + '%';
}

// ========== 13. ATUALIZAR INTERFACE PRINCIPAL ==========

function atualizarInterface() {
    const aportes = gAportes.obterTodos();
    const dividendos = gDividendos.obterTodos();
    atualizarResumo(aportes, dividendos);
    renderizarCarteiraConsolidada(aportes);
    renderizarTabelaAportes(aportes);
    renderizarTabelaDividendos(dividendos);
    renderizarGraficos(aportes, dividendos);
}

// ========== 14. RADAR DE OPORTUNIDADES ==========

async function atualizarRadar() {
    const container = document.getElementById('radarContainer');
    if (!container) return;
    const itens = gRadar.obterTodos();
    if (!itens || itens.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; color:#888; padding:1rem 0; text-align:center;">Nenhum ativo no radar.</p>';
        return;
    }

    // Mostra indicador de carregamento (bom para UX)
    container.innerHTML = '<div style="grid-column: 1/-1; color:#888; padding:1rem 0; text-align:center;">A buscar cotações...</div>';

    const cards = await Promise.all(itens.map(async item => {
        const codigo = item.codigo || item.ativo || '';
        const precoTeto = parseFloat(item.precoTeto || item.teto || 0);
        const precoAtual = await buscarCotacaoReal(codigo);
        
        let statusTexto = 'Indisponível';
        let statusClasse = 'status-indisponivel';
        let cardClasse = 'card-sem-dados';
        
        if (precoAtual !== null) {
            if (precoAtual <= precoTeto) {
                statusTexto = 'Comprar';
                statusClasse = 'status-compra';
                cardClasse = 'card-comprar';
            } else {
                statusTexto = 'Aguardar';
                statusClasse = 'status-aguardar';
                cardClasse = 'card-aguardar';
            }
        }

        const tetoFormat = precoTeto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const atualFormat = precoAtual !== null 
            ? 'R$ ' + precoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
            : 'Carregando...';

        return `
            <div class="radar-card ${cardClasse}">
                <button class="radar-remove" onclick="window.removerRadar('${item.id || codigo}')" title="Remover">🗑️</button>
                <div style="font-weight:700; font-size:1.1rem; color:var(--cor-azul-marinho); margin-bottom:0.5rem; display:flex; align-items:center; gap:6px;">
                    🎯 ${codigo}
                </div>
                <div style="font-size:0.85rem; color:#555;">Preço Teto: <strong style="color:#222;">R$ ${tetoFormat}</strong></div>
                <div style="font-size:0.85rem; color:#555; margin-bottom:0.6rem;">Cotação Atual: <strong style="color:#222;">${atualFormat}</strong></div>
                <div class="radar-status ${statusClasse}">${statusTexto}</div>
            </div>
        `;
    }));
    container.innerHTML = cards.join('');
}

window.removerRadar = async function (id) {
    if (!confirm('Remover este ativo do Radar?')) return;
    await gRadar.remover(id);
    window.mostrarAlerta('Ativo removido do Radar.', 'success');
};

// ========== 15. EDITAR / REMOVER APORTES ==========

window.editarAporte = function (id) {
    const aporte = gAportes.obterTodos().find(a => a.id == id);
    if (!aporte) return;
    idEdicaoAporte = id;
    document.getElementById('codigoAporte').value = aporte.codigo || aporte.ativo || '';
    document.getElementById('setorAporte').value = aporte.setor || '';
    document.getElementById('quantidadeAporte').value = aporte.quantidade || aporte.qtd || '';
    document.getElementById('precoAporte').value = aporte.preco || aporte.precoPago || '';
    document.getElementById('dataAporte').value = aporte.data || aporte.dataAporte || aporte.dataCompra || '';
    document.getElementById('notaCorretagem').value = aporte.nota || aporte.notaCorretagem || '';
    document.getElementById('btnSubmitAporte').textContent = 'Atualizar Aporte';
    document.getElementById('btnCancelarAporte').style.display = 'inline-block';
    document.getElementById('codigoAporte').scrollIntoView({ behavior: 'smooth' });
};

window.removerAporte = async function (id) {
    if (!confirm('Remover este aporte?')) return;
    await gAportes.remover(id);
    window.mostrarAlerta('Aporte removido.', 'success');
};

// ========== 16. EDITAR / REMOVER DIVIDENDOS ==========

window.editarDividendo = function (id) {
    const div = gDividendos.obterTodos().find(d => d.id == id);
    if (!div) return;
    idEdicaoDividendo = id;
    document.getElementById('codigoDividendo').value = div.codigo || div.ativo || '';
    document.getElementById('valorDividendo').value = div.valor || div.valorRecebido || '';
    document.getElementById('dataPagamento').value = div.data || div.dataPagamento || '';
    document.getElementById('descricaoDividendo').value = div.descricao || '';
    document.getElementById('btnSubmitDividendo').textContent = 'Atualizar Dividendo';
    document.getElementById('btnCancelarDividendo').style.display = 'inline-block';
    document.getElementById('codigoDividendo').scrollIntoView({ behavior: 'smooth' });
};

window.removerDividendo = async function (id) {
    if (!confirm('Remover este dividendo?')) return;
    await gDividendos.remover(id);
    window.mostrarAlerta('Dividendo removido.', 'success');
};

// ========== 17. INICIALIZAÇÃO DO DOM ==========

document.addEventListener('DOMContentLoaded', () => {

    // --- Formulário de Aportes ---
    const formAporte = document.getElementById('formAporte');
    if (formAporte) {
        formAporte.addEventListener('submit', async (e) => {
            e.preventDefault();
            const codigo = document.getElementById('codigoAporte').value.trim().toUpperCase();
            const setor = document.getElementById('setorAporte').value.trim();
            const quantidade = parseFloat(document.getElementById('quantidadeAporte').value);
            const preco = parseFloat(document.getElementById('precoAporte').value);
            const data = document.getElementById('dataAporte').value;
            const nota = document.getElementById('notaCorretagem').value.trim();

            if (!codigo || !setor || isNaN(quantidade) || quantidade <= 0 || isNaN(preco) || preco <= 0 || !data) {
                window.mostrarAlerta('Preencha todos os campos obrigatórios corretamente.', 'erro');
                return;
            }

            const item = { codigo, setor, quantidade, preco, data, nota };

            if (idEdicaoAporte) {
                await gAportes.atualizar(idEdicaoAporte, item);
                window.mostrarAlerta('Aporte atualizado!', 'success');
                idEdicaoAporte = null;
                document.getElementById('btnSubmitAporte').textContent = 'Salvar Aporte';
                document.getElementById('btnCancelarAporte').style.display = 'none';
            } else {
                await gAportes.adicionar(item);
                window.mostrarAlerta('Aporte salvo!', 'success');
            }
            formAporte.reset();
        });
    }

    const btnCancelarAporte = document.getElementById('btnCancelarAporte');
    if (btnCancelarAporte) {
        btnCancelarAporte.addEventListener('click', () => {
            idEdicaoAporte = null;
            document.getElementById('formAporte').reset();
            document.getElementById('btnSubmitAporte').textContent = 'Salvar Aporte';
            btnCancelarAporte.style.display = 'none';
        });
    }

    // --- Formulário de Dividendos ---
    const formDividendos = document.getElementById('formDividendos');
    if (formDividendos) {
        formDividendos.addEventListener('submit', async (e) => {
            e.preventDefault();
            const codigo = document.getElementById('codigoDividendo').value.trim().toUpperCase();
            const valor = parseFloat(document.getElementById('valorDividendo').value);
            const data = document.getElementById('dataPagamento').value;
            const descricao = document.getElementById('descricaoDividendo').value.trim();

            if (!codigo || isNaN(valor) || valor <= 0 || !data) {
                window.mostrarAlerta('Preencha os campos obrigatórios do dividendo.', 'erro');
                return;
            }

            const item = { codigo, valor, data, descricao };

            if (idEdicaoDividendo) {
                await gDividendos.atualizar(idEdicaoDividendo, item);
                window.mostrarAlerta('Dividendo atualizado!', 'success');
                idEdicaoDividendo = null;
                document.getElementById('btnSubmitDividendo').textContent = 'Salvar Dividendo';
                document.getElementById('btnCancelarDividendo').style.display = 'none';
            } else {
                await gDividendos.adicionar(item);
                window.mostrarAlerta('Dividendo salvo!', 'success');
            }
            formDividendos.reset();
        });
    }

    const btnCancelarDividendo = document.getElementById('btnCancelarDividendo');
    if (btnCancelarDividendo) {
        btnCancelarDividendo.addEventListener('click', () => {
            idEdicaoDividendo = null;
            document.getElementById('formDividendos').reset();
            document.getElementById('btnSubmitDividendo').textContent = 'Salvar Dividendo';
            btnCancelarDividendo.style.display = 'none';
        });
    }

    // --- Formulário do Radar ---
    const formRadar = document.getElementById('formRadar');
    if (formRadar) {
        formRadar.addEventListener('submit', async (e) => {
            e.preventDefault();
            const codigo = document.getElementById('codigoRadar').value.trim().toUpperCase();
            const precoTeto = parseFloat(document.getElementById('precoTeto').value);
            if (!codigo || isNaN(precoTeto) || precoTeto <= 0) {
                window.mostrarAlerta('Preencha o código e o preço teto.', 'erro');
                return;
            }
            await gRadar.adicionar({ codigo, precoTeto }, codigo);
            window.mostrarAlerta(`${codigo} adicionado ao Radar!`, 'success');
            formRadar.reset();
        });
    }

    // --- Botões Histórico de Operações ---
    const btnExportarAportes = document.getElementById('btnExportarAportes');
    if (btnExportarAportes) {
        btnExportarAportes.addEventListener('click', () => {
            exportarCSV(
                gAportes.obterTodos(),
                ['codigo', 'setor', 'quantidade', 'preco', 'data', 'nota'],
                'aportes.csv'
            );
        });
    }

    const fileImportAportes = document.getElementById('fileImportAportes');
    const btnImportarAportes = document.getElementById('btnImportarAportes');
    if (btnImportarAportes && fileImportAportes) {
        btnImportarAportes.addEventListener('click', () => fileImportAportes.click());
        fileImportAportes.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const n = await importarCSV(
                    file,
                    ['codigo', 'setor', 'quantidade', 'preco', 'data', 'nota'],
                    gAportes,
                    obj => ({
                        codigo: (obj.codigo || '').toUpperCase(),
                        setor: obj.setor || '',
                        quantidade: parseFloat(obj.quantidade) || 0,
                        preco: parseFloat(obj.preco) || 0,
                        data: obj.data || '',
                        nota: obj.nota || ''
                    })
                );
                window.mostrarAlerta(`${n} aportes importados com sucesso!`, 'success');
            } catch (err) {
                window.mostrarAlerta('Erro ao importar CSV. Verifique o formato.', 'erro');
            }
            fileImportAportes.value = '';
        });
    }

    const btnModeloAportes = document.getElementById('btnModeloAportes');
    if (btnModeloAportes) {
        btnModeloAportes.addEventListener('click', () => {
            baixarModelo(['codigo', 'setor', 'quantidade', 'preco', 'data', 'nota'], 'modelo_aportes.csv');
        });
    }

    // --- Botões Evolução de Dividendos ---
    const btnExportarDividendos = document.getElementById('btnExportarDividendos');
    if (btnExportarDividendos) {
        btnExportarDividendos.addEventListener('click', () => {
            exportarCSV(
                gDividendos.obterTodos(),
                ['codigo', 'valor', 'data', 'descricao'],
                'dividendos.csv'
            );
        });
    }

    const fileImportDividendos = document.getElementById('fileImportDividendos');
    const btnImportarDividendos = document.getElementById('btnImportarDividendos');
    if (btnImportarDividendos && fileImportDividendos) {
        btnImportarDividendos.addEventListener('click', () => fileImportDividendos.click());
        fileImportDividendos.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const n = await importarCSV(
                    file,
                    ['codigo', 'valor', 'data', 'descricao'],
                    gDividendos,
                    obj => ({
                        codigo: (obj.codigo || '').toUpperCase(),
                        valor: parseFloat(obj.valor) || 0,
                        data: obj.data || '',
                        descricao: obj.descricao || ''
                    })
                );
                window.mostrarAlerta(`${n} dividendos importados com sucesso!`, 'success');
            } catch (err) {
                window.mostrarAlerta('Erro ao importar CSV. Verifique o formato.', 'erro');
            }
            fileImportDividendos.value = '';
        });
    }

    const btnModeloDividendos = document.getElementById('btnModeloDividendos');
    if (btnModeloDividendos) {
        btnModeloDividendos.addEventListener('click', () => {
            baixarModelo(['codigo', 'valor', 'data', 'descricao'], 'modelo_dividendos.csv');
        });
    }

});
