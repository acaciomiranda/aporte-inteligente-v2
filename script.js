/**
 * =============================================================================
 * APORTE INTELIGENTE — v2 | Frontend / Lógica da Aplicação
 * =============================================================================
 * Este arquivo contém TODA a lógica do frontend da aplicação.
 *
 * ARQUITETURA:
 *  - As funções chamadas por atributos onclick no HTML (ex: onclick="window.X()")
 *    DEVEM ser expostas via window.nomeDaFunção. Isso é obrigatório em arquivos
 *    .js externos — diferente de scripts inline em <script> tags, onde funções
 *    declaradas com "function nome()" ficam automaticamente no escopo global.
 *    Esta foi a principal causa dos botões não funcionarem na versão anterior.
 *
 *  - Toda comunicação com dados usa a API REST do backend (fetch → /api/...).
 *    Não há mais uso de localStorage — os dados vivem no SQLite (app.db).
 *
 *  - O token da Brapi nunca aparece aqui (fica seguro no backend/.env).
 *    As cotações são buscadas via proxy: fetch('/api/quote/:codigo').
 *
 * FUNÇÕES EXPOSTAS NO WINDOW (chamadas pelo HTML):
 *  - window.toggleSecao(botao)       → minimiza/expande uma seção individual
 *  - window.toggleTodasSecoes()      → minimiza/expande todas as seções
 *  - window.entrarModoEdicao(id)     → preenche formulário para editar aporte
 *  - window.excluirAporte(id)        → remove aporte com confirmação
 *  - window.editarDividendo(id)      → preenche formulário para editar dividendo
 *  - window.excluirDividendo(id)     → remove dividendo com confirmação
 *  - window.removerDoRadar(id)       → remove ativo do radar com confirmação
 *  - window.copiarGrafico(canvasId)  → copia card de gráfico como PNG
 *
 * INICIALIZAÇÃO:
 *  O ponto de entrada é o evento 'DOMContentLoaded', que garante que o HTML
 *  já está pronto antes de anexar os event listeners e carregar os dados.
 * =============================================================================
 */

// ========== VARIÁVEIS GLOBAIS ==========
let idEdicao = null;
let idEdicaoDividendo = null;
let todasOcultas = false;

// ========== PALETA DE CORES ==========
const paletaCores = ['#001435', '#FDB913', '#1e88e5', '#43a047', '#e53935', '#fb8c00', '#8e24aa', '#3949ab', '#00acc1', '#7cb342'];

// ========== CLASSES ==========
class GerenciadorAportes {
    constructor() { this.aportes = []; }
    async carregarDados() {
        const res = await fetch('/api/aportes');
        this.aportes = await res.json();
    }
    async adicionar(aporte) {
        const res = await fetch('/api/aportes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(aporte) });
        const novo = await res.json();
        this.aportes.unshift(novo);
    }
    obterTodos() { return this.aportes; }
    obterPorId(id) { return this.aportes.find(a => a.id === id); }
    async remover(id) {
        await fetch(`/api/aportes/${id}`, { method: 'DELETE' });
        this.aportes = this.aportes.filter(a => a.id !== id);
    }
    async atualizar(id, aporte) {
        const res = await fetch(`/api/aportes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(aporte) });
        const atualizado = await res.json();
        const i = this.aportes.findIndex(x => x.id === id);
        if (i !== -1) this.aportes[i] = atualizado;
    }
}

class GerenciadorDividendos {
    constructor() { this.dividendos = []; }
    async carregarDados() {
        const res = await fetch('/api/dividendos');
        this.dividendos = await res.json();
    }
    async adicionar(d) {
        const res = await fetch('/api/dividendos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
        const novo = await res.json();
        this.dividendos.unshift(novo);
    }
    obterTodos() { return this.dividendos; }
    obterPorId(id) { return this.dividendos.find(d => d.id === id); }
    async remover(id) {
        await fetch(`/api/dividendos/${id}`, { method: 'DELETE' });
        this.dividendos = this.dividendos.filter(d => d.id !== id);
    }
    async atualizar(id, d) {
        const res = await fetch(`/api/dividendos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
        const atualizado = await res.json();
        const i = this.dividendos.findIndex(x => x.id === id);
        if (i !== -1) this.dividendos[i] = atualizado;
    }
}

class GerenciadorRadar {
    constructor() { this.itens = []; }
    async carregarDados() {
        const res = await fetch('/api/radar');
        this.itens = await res.json();
    }
    async adicionarItem(codigo, precoTeto) {
        if (this.existeItem(codigo)) {
            mostrarAlerta('Este ativo já está no radar!', 'erro');
            return false;
        }
        try {
            const res = await fetch('/api/radar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo, precoTeto }) });
            if (!res.ok) throw new Error('Erro');
            const novo = await res.json();
            this.itens.unshift(novo);
            return true;
        } catch {
            mostrarAlerta('Erro ao adicionar no radar', 'erro');
            return false;
        }
    }
    async removerItem(id) {
        await fetch(`/api/radar/${id}`, { method: 'DELETE' });
        this.itens = this.itens.filter(i => i.id !== id);
    }
    obterTodos() { return this.itens; }
    obterPorId(id) { return this.itens.find(i => i.id === id); }
    existeItem(codigo) { return this.itens.some(i => i.codigo === codigo.toUpperCase()); }
}

// ========== INSTÂNCIAS GLOBAIS ==========
const gerenciador = new GerenciadorAportes();
const gDividendos = new GerenciadorDividendos();
const gerenciadorRadar = new GerenciadorRadar();

// ========== FUNÇÕES UTILITÁRIAS ==========
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatarData(data) {
    // Adiciona T00:00 para evitar problema de fuso horário
    const d = data.includes('T') ? new Date(data) : new Date(data + 'T00:00:00');
    return d.toLocaleDateString('pt-BR');
}

function formatarDataInput(data) {
    const d = data.includes('T') ? new Date(data) : new Date(data + 'T00:00:00');
    return d.toISOString().split('T')[0];
}

function mostrarAlerta(mensagem, tipo = 'sucesso') {
    const alerta = document.createElement('div');
    alerta.className = `alerta ${tipo}`;
    alerta.textContent = mensagem;
    alerta.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;padding:1rem 1.5rem;border-radius:8px;font-weight:600;animation:slideIn 0.3s ease;';
    if (tipo === 'sucesso') {
        alerta.style.background = '#c8e6c9';
        alerta.style.color = '#2e7d32';
        alerta.style.borderLeft = '4px solid #388e3c';
    } else {
        alerta.style.background = '#ffcdd2';
        alerta.style.color = '#c62828';
        alerta.style.borderLeft = '4px solid #d32f2f';
    }
    document.body.appendChild(alerta);
    setTimeout(() => alerta.remove(), 3000);
}

// ========== INTEGRAÇÃO COM API BRAPI ==========
async function buscarCotacaoReal(codigo) {
    try {
        const response = await fetch(`/api/quote/${codigo}`);
        if (!response.ok) throw new Error('Erro na API');
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            return data.results[0].regularMarketPrice;
        }
        return null;
    } catch (error) {
        console.warn(`Cotação indisponível para ${codigo}`);
        return null;
    }
}

// ========== FUNÇÕES DE COLLAPSE (EXPOSTAS NO WINDOW) ==========
window.toggleSecao = function (botao) {
    const conteudo = botao.closest('section, .card').querySelector('.conteudo-secao');
    if (!conteudo) return;
    if (conteudo.style.display === 'none') {
        conteudo.style.display = 'block';
        botao.textContent = '➖';
    } else {
        conteudo.style.display = 'none';
        botao.textContent = '➕';
    }
};

window.toggleTodasSecoes = function () {
    todasOcultas = !todasOcultas;
    document.querySelectorAll('.card').forEach(secao => {
        const conteudo = secao.querySelector('.conteudo-secao');
        const botao = secao.querySelector('button[onclick*="toggleSecao"]');
        if (conteudo) conteudo.style.display = todasOcultas ? 'none' : 'block';
        if (botao) botao.textContent = todasOcultas ? '➕' : '➖';
    });
};

// ========== FORMULÁRIO DE APORTES ==========
document.addEventListener('DOMContentLoaded', () => {
    const formAporte = document.getElementById('formAporte');
    if (formAporte) {
        formAporte.addEventListener('submit', async (e) => {
            e.preventDefault();
            const dados = {
                codigoAtivo: document.getElementById('codigoAporte').value.toUpperCase(),
                setorAporte: document.getElementById('setorAporte').value,
                quantidade: parseInt(document.getElementById('quantidadeAporte').value),
                precoPago: parseFloat(document.getElementById('precoAporte').value),
                dataCompra: document.getElementById('dataAporte').value,
                nota: document.getElementById('notaCorretagem').value
            };
            if (idEdicao === null) {
                await gerenciador.adicionar(dados);
                mostrarAlerta('Aporte salvo com sucesso!');
            } else {
                await gerenciador.atualizar(idEdicao, dados);
                mostrarAlerta('Aporte atualizado com sucesso!');
                cancelarEdicao();
            }
            formAporte.reset();
            document.getElementById('dataAporte').valueAsDate = new Date();
            await atualizarInterface();
        });
    }

    const btnCancelarAporte = document.getElementById('btnCancelarAporte');
    if (btnCancelarAporte) btnCancelarAporte.addEventListener('click', cancelarEdicao);

    const formDividendos = document.getElementById('formDividendos');
    if (formDividendos) {
        formDividendos.addEventListener('submit', async (e) => {
            e.preventDefault();
            const dados = {
                codigoDividendo: document.getElementById('codigoDividendo').value.toUpperCase(),
                valorDividendo: parseFloat(document.getElementById('valorDividendo').value),
                dataPagamento: document.getElementById('dataPagamento').value,
                descricaoDividendo: document.getElementById('descricaoDividendo').value
            };
            if (idEdicaoDividendo === null) {
                await gDividendos.adicionar(dados);
                mostrarAlerta('Dividendo salvo com sucesso!');
            } else {
                await gDividendos.atualizar(idEdicaoDividendo, dados);
                mostrarAlerta('Dividendo atualizado com sucesso!');
                cancelarEdicaoDividendo();
            }
            formDividendos.reset();
            document.getElementById('dataPagamento').valueAsDate = new Date();
            await atualizarInterface();
        });
    }

    const btnCancelarDividendo = document.getElementById('btnCancelarDividendo');
    if (btnCancelarDividendo) btnCancelarDividendo.addEventListener('click', cancelarEdicaoDividendo);

    const formRadar = document.getElementById('formRadar');
    if (formRadar) {
        formRadar.addEventListener('submit', async (e) => {
            e.preventDefault();
            const codigo = document.getElementById('codigoRadar').value.toUpperCase();
            const precoTeto = parseFloat(document.getElementById('precoTeto').value);
            if (await gerenciadorRadar.adicionarItem(codigo, precoTeto)) {
                formRadar.reset();
                mostrarAlerta('Ativo adicionado ao radar!');
                await atualizarInterface();
            }
        });
    }

    // Exportar / Importar / Modelo
    document.getElementById('btnExportarAportes')?.addEventListener('click', exportarParaCSV);
    document.getElementById('btnExportarDividendos')?.addEventListener('click', exportarDividendosParaCSV);
    document.getElementById('btnModeloAportes')?.addEventListener('click', baixarModeloAportes);
    document.getElementById('btnModeloDividendos')?.addEventListener('click', baixarModeloDividendos);
    document.getElementById('btnImportarAportes')?.addEventListener('click', () => document.getElementById('fileImportAportes').click());
    document.getElementById('btnImportarDividendos')?.addEventListener('click', () => document.getElementById('fileImportDividendos').click());
    document.getElementById('fileImportAportes')?.addEventListener('change', (e) => importarAportes(e.target.files[0]));
    document.getElementById('fileImportDividendos')?.addEventListener('change', (e) => importarDividendos(e.target.files[0]));

    inicializar();
});

// ========== EDIÇÃO DE APORTES ==========
window.entrarModoEdicao = function (id) {
    const aporte = gerenciador.obterPorId(id);
    if (!aporte) return;
    idEdicao = id;
    document.getElementById('codigoAporte').value = aporte.codigoAtivo;
    document.getElementById('setorAporte').value = aporte.setorAporte;
    document.getElementById('quantidadeAporte').value = aporte.quantidade;
    document.getElementById('precoAporte').value = aporte.precoPago;
    document.getElementById('dataAporte').value = formatarDataInput(aporte.dataCompra);
    document.getElementById('notaCorretagem').value = aporte.nota || '';
    document.getElementById('btnSubmitAporte').textContent = 'Atualizar Aporte';
    document.getElementById('btnCancelarAporte').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function cancelarEdicao() {
    idEdicao = null;
    document.getElementById('formAporte').reset();
    document.getElementById('dataAporte').valueAsDate = new Date();
    document.getElementById('btnSubmitAporte').textContent = 'Salvar Aporte';
    document.getElementById('btnCancelarAporte').style.display = 'none';
}

window.excluirAporte = async function (id) {
    if (confirm('Tem certeza que deseja excluir este aporte?')) {
        await gerenciador.remover(id);
        mostrarAlerta('Aporte excluído com sucesso!');
        await atualizarInterface();
    }
};

// ========== EDIÇÃO DE DIVIDENDOS ==========
window.editarDividendo = function (id) {
    const dividendo = gDividendos.obterPorId(id);
    if (!dividendo) return;
    idEdicaoDividendo = id;
    document.getElementById('codigoDividendo').value = dividendo.codigoDividendo;
    document.getElementById('valorDividendo').value = dividendo.valorDividendo;
    document.getElementById('dataPagamento').value = formatarDataInput(dividendo.dataPagamento);
    document.getElementById('descricaoDividendo').value = dividendo.descricaoDividendo || '';
    document.getElementById('btnSubmitDividendo').textContent = 'Atualizar Dividendo';
    document.getElementById('btnCancelarDividendo').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function cancelarEdicaoDividendo() {
    idEdicaoDividendo = null;
    document.getElementById('formDividendos').reset();
    document.getElementById('dataPagamento').valueAsDate = new Date();
    document.getElementById('btnSubmitDividendo').textContent = 'Salvar Dividendo';
    document.getElementById('btnCancelarDividendo').style.display = 'none';
}

window.excluirDividendo = async function (id) {
    if (confirm('Tem certeza que deseja excluir este dividendo?')) {
        await gDividendos.remover(id);
        mostrarAlerta('Dividendo excluído com sucesso!');
        await atualizarInterface();
    }
};

// ========== RADAR ==========
window.removerDoRadar = async function (id) {
    if (confirm('Tem certeza que deseja remover este ativo do radar?')) {
        await gerenciadorRadar.removerItem(id);
        mostrarAlerta('Ativo removido do radar com sucesso!');
        await atualizarInterface();
    }
};

// ========== TABELA DE APORTES ==========
function atualizarTabelaAportes() {
    const aportes = gerenciador.obterTodos().sort((a, b) => new Date(b.dataCompra) - new Date(a.dataCompra));
    const container = document.getElementById('tabelaContainer');
    if (!container) return;
    if (aportes.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding:1rem;">Nenhum aporte registrado.</p>';
        return;
    }
    let html = '<table><thead><tr><th>Ativo</th><th>Setor</th><th>Data</th><th>Quantidade</th><th>Preço Unit.</th><th>Total</th><th>Nota</th><th>Ações</th></tr></thead><tbody>';
    aportes.forEach(aporte => {
        const total = aporte.quantidade * aporte.precoPago;
        const notaSegura = aporte.nota ? aporte.nota.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
        const notaHtml = aporte.nota ? `<a href="${notaSegura}" target="_blank" rel="noopener noreferrer">🔗 Abrir</a>` : '-';
        html += `<tr>
            <td>${aporte.codigoAtivo}</td>
            <td>${aporte.setorAporte}</td>
            <td>${formatarData(aporte.dataCompra)}</td>
            <td>${aporte.quantidade}</td>
            <td>${formatarMoeda(aporte.precoPago)}</td>
            <td>${formatarMoeda(total)}</td>
            <td>${notaHtml}</td>
            <td>
                <button class="btn-edit" onclick="window.entrarModoEdicao(${aporte.id})">Editar</button>
                <button class="btn-danger" onclick="window.excluirAporte(${aporte.id})">Excluir</button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ========== CARTEIRA CONSOLIDADA ==========
async function atualizarCarteiraConsolidada() {
    const aportes = gerenciador.obterTodos();
    const container = document.getElementById('tabelaCarteiraContainer');
    if (!container) return;
    if (aportes.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding:1rem;">Nenhum aporte registrado.</p>';
        return;
    }
    const carteira = {};
    aportes.forEach(aporte => {
        if (!carteira[aporte.codigoAtivo]) {
            carteira[aporte.codigoAtivo] = { codigo: aporte.codigoAtivo, setor: aporte.setorAporte, quantidade: 0, totalInvestido: 0 };
        }
        carteira[aporte.codigoAtivo].quantidade += aporte.quantidade;
        carteira[aporte.codigoAtivo].totalInvestido += aporte.quantidade * aporte.precoPago;
    });
    Object.keys(carteira).forEach(codigo => {
        carteira[codigo].precoMedio = carteira[codigo].totalInvestido / carteira[codigo].quantidade;
    });
    let html = '<table><thead><tr><th>Ativo</th><th>Setor</th><th>Qtd</th><th>Preço Médio</th><th>Cotação Atual</th><th>Total Atual</th><th>Lucro/Prejuízo</th><th>YoC (%)</th></tr></thead><tbody>';
    for (const codigo of Object.keys(carteira)) {
        const ativo = carteira[codigo];
        const cotacao = await buscarCotacaoReal(codigo) || ativo.precoMedio;
        const totalAtual = ativo.quantidade * cotacao;
        const lucroPreju = totalAtual - ativo.totalInvestido;
        const percentualLucro = (lucroPreju / ativo.totalInvestido) * 100;
        const dividendosAtivo = gDividendos.obterTodos().filter(d => d.codigoDividendo === codigo).reduce((sum, d) => sum + parseFloat(d.valorDividendo), 0);
        const yoc = (dividendosAtivo / ativo.totalInvestido) * 100;
        const corLucro = lucroPreju >= 0 ? '#388e3c' : '#d32f2f';
        html += `<tr>
            <td><strong>${codigo}</strong></td>
            <td>${ativo.setor}</td>
            <td>${ativo.quantidade}</td>
            <td>${formatarMoeda(ativo.precoMedio)}</td>
            <td>${formatarMoeda(cotacao)}</td>
            <td>${formatarMoeda(totalAtual)}</td>
            <td style="color: ${corLucro};">${formatarMoeda(lucroPreju)} (${percentualLucro.toFixed(2)}%)</td>
            <td>${yoc.toFixed(2)}%</td>
        </tr>`;
    }
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ========== TABELA DE DIVIDENDOS ==========
function atualizarTabelaDividendos() {
    const dividendos = gDividendos.obterTodos().sort((a, b) => new Date(b.dataPagamento) - new Date(a.dataPagamento));
    const container = document.getElementById('tabelaDividendosContainer');
    if (!container) return;
    if (dividendos.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding:1rem;">Nenhum dividendo registrado.</p>';
        return;
    }
    let html = '<table><thead><tr><th>Ativo</th><th>Data</th><th>Descrição</th><th>Valor</th><th>Ações</th></tr></thead><tbody>';
    dividendos.forEach(dividendo => {
        const descricao = dividendo.descricaoDividendo || '-';
        html += `<tr>
            <td>${dividendo.codigoDividendo}</td>
            <td>${formatarData(dividendo.dataPagamento)}</td>
            <td>${descricao}</td>
            <td>${formatarMoeda(parseFloat(dividendo.valorDividendo))}</td>
            <td>
                <button class="btn-edit" onclick="window.editarDividendo(${dividendo.id})">Editar</button>
                <button class="btn-danger" onclick="window.excluirDividendo(${dividendo.id})">Excluir</button>
            </td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ========== RESUMO GERAL ==========
function atualizarResumoGeral() {
    const totalInvestido = gerenciador.obterTodos().reduce((acc, a) => acc + (a.quantidade * a.precoPago), 0);
    const totalDividendos = gDividendos.obterTodos().reduce((acc, d) => acc + parseFloat(d.valorDividendo), 0);
    const retorno = totalInvestido > 0 ? (totalDividendos / totalInvestido) * 100 : 0;
    const elInv = document.getElementById('resumoInvestido');
    const elDiv = document.getElementById('resumoDividendos');
    const elRet = document.getElementById('resumoRetorno');
    if (elInv) elInv.textContent = formatarMoeda(totalInvestido);
    if (elDiv) elDiv.textContent = formatarMoeda(totalDividendos);
    if (elRet) elRet.textContent = retorno.toFixed(2) + '%';
}

// ========== GRÁFICOS ==========
let chart1, chart2, chart3, chart4;

function atualizarGraficos() {
    const aportes = gerenciador.obterTodos();
    const dividendos = gDividendos.obterTodos();
    if (aportes.length === 0) return;

    const ativos = {};
    aportes.forEach(a => {
        if (!ativos[a.codigoAtivo]) ativos[a.codigoAtivo] = 0;
        ativos[a.codigoAtivo] += a.quantidade * a.precoPago;
    });
    const labels = Object.keys(ativos);
    const valores = Object.values(ativos);

    const ctx1 = document.getElementById('chartComposicao');
    if (ctx1) {
        if (chart1) chart1.destroy();
        chart1 = new Chart(ctx1.getContext('2d'), {
            type: 'doughnut',
            data: { labels, datasets: [{ data: valores, backgroundColor: paletaCores.slice(0, labels.length), borderColor: '#fff', borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } } }
        });
    }

    const ctx2 = document.getElementById('chartValores');
    if (ctx2) {
        if (chart2) chart2.destroy();
        chart2 = new Chart(ctx2.getContext('2d'), {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Valor Investido (R$)', data: valores, backgroundColor: paletaCores.slice(0, labels.length), borderColor: labels.map(() => '#001435'), borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: true } } }
        });
    }

    const setoresAgrupados = {};
    aportes.forEach(a => {
        if (!setoresAgrupados[a.setorAporte]) setoresAgrupados[a.setorAporte] = 0;
        setoresAgrupados[a.setorAporte] += a.quantidade * a.precoPago;
    });
    const labelSetores = Object.keys(setoresAgrupados);
    const valoresSetores = Object.values(setoresAgrupados);

    const ctx3 = document.getElementById('graficoSetor');
    if (ctx3) {
        if (chart3) chart3.destroy();
        chart3 = new Chart(ctx3.getContext('2d'), {
            type: 'doughnut',
            data: { labels: labelSetores, datasets: [{ data: valoresSetores, backgroundColor: paletaCores.slice(0, labelSetores.length), borderColor: '#fff', borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } } }
        });
    }

    const dividendosPorMes = {};
    dividendos.forEach(div => {
        const data = new Date(div.dataPagamento);
        const mesAno = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
        if (!dividendosPorMes[mesAno]) dividendosPorMes[mesAno] = 0;
        dividendosPorMes[mesAno] += parseFloat(div.valorDividendo);
    });
    const labelMeses = Object.keys(dividendosPorMes).sort();
    const valoresMeses = labelMeses.map(mes => dividendosPorMes[mes]);

    const ctx4 = document.getElementById('graficoDividendos');
    if (ctx4) {
        if (chart4) chart4.destroy();
        chart4 = new Chart(ctx4.getContext('2d'), {
            type: 'bar',
            data: { labels: labelMeses, datasets: [{ label: 'Dividendos Recebidos (R$)', data: valoresMeses, backgroundColor: '#388e3c', borderColor: '#2e7d32', borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: true } } }
        });
    }
}

// ========== RADAR ==========
async function atualizarRadar() {
    const itens = gerenciadorRadar.obterTodos();
    const container = document.getElementById('radarContainer');
    if (!container) return;
    if (itens.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding:1rem;">Nenhum ativo no radar.</p>';
        return;
    }
    let html = '';
    for (const item of itens) {
        const cotacao = await buscarCotacaoReal(item.codigo);
        let status, statusClass;
        if (cotacao === null) {
            status = '⚠️ Indisponível';
            statusClass = 'status-indisponivel';
        } else if (cotacao <= item.precoTeto) {
            status = '🟢 Comprar (Desconto)';
            statusClass = 'status-compra';
        } else {
            status = '🔴 Aguardar (Caro)';
            statusClass = 'status-aguardar';
        }
        html += `<div class="radar-card">
            <button class="radar-remove" onclick="window.removerDoRadar(${item.id})">🗑️</button>
            <strong>${item.codigo}</strong><br>
            Preço Teto: ${formatarMoeda(item.precoTeto)}<br>
            Cotação Atual: ${cotacao ? formatarMoeda(cotacao) : 'Indisponível'}<br>
            <span class="radar-status ${statusClass}">${status}</span>
        </div>`;
    }
    container.innerHTML = html;
}

// ========== COPIAR GRÁFICO ==========
window.copiarGrafico = async function (canvasId) {
    try {
        const canvas = document.getElementById(canvasId);
        if (!canvas) { mostrarAlerta('Gráfico não encontrado.', 'erro'); return; }
        const cardElement = canvas.closest('.chart-card');
        if (!cardElement) { mostrarAlerta('Card não encontrado.', 'erro'); return; }
        const imageCanvas = await html2canvas(cardElement, { backgroundColor: '#ffffff', scale: 2, logging: false });
        imageCanvas.toBlob(async (blob) => {
            try {
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                mostrarAlerta('Gráfico copiado para a área de transferência!');
            } catch (e) {
                mostrarAlerta('Permissão de clipboard negada pelo navegador.', 'erro');
            }
        });
    } catch (err) {
        console.error('Erro ao copiar gráfico:', err);
        mostrarAlerta('Erro ao copiar gráfico.', 'erro');
    }
};

// ========== EXPORTAR ==========
function exportarParaCSV() {
    const aportes = gerenciador.obterTodos();
    if (aportes.length === 0) { mostrarAlerta('Nenhum aporte para exportar!', 'erro'); return; }
    let csv = 'Data;Ativo;Setor;Quantidade;Preço Unitário;Total Investido;Link da Nota\n';
    aportes.forEach(aporte => {
        const total = aporte.quantidade * aporte.precoPago;
        const nota = aporte.nota || '';
        csv += `${aporte.dataCompra};${aporte.codigoAtivo};${aporte.setorAporte};${aporte.quantidade};${aporte.precoPago.toFixed(2)};${total.toFixed(2)};${nota}\n`;
    });
    downloadCSV(csv, 'meus_aportes_b3.csv');
    mostrarAlerta('Aportes exportados com sucesso!');
}

function exportarDividendosParaCSV() {
    const dividendos = gDividendos.obterTodos();
    if (dividendos.length === 0) { mostrarAlerta('Nenhum dividendo para exportar!', 'erro'); return; }
    let csv = 'Data;Ativo;Descrição;Valor\n';
    dividendos.forEach(div => {
        const descricao = div.descricaoDividendo || '';
        csv += `${div.dataPagamento};${div.codigoDividendo};${descricao};${parseFloat(div.valorDividendo).toFixed(2)}\n`;
    });
    downloadCSV(csv, 'meus_dividendos_b3.csv');
    mostrarAlerta('Dividendos exportados com sucesso!');
}

function downloadCSV(csv, filename) {
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

// ========== BAIXAR MODELO ==========
function baixarModeloAportes() {
    const csv = 'Data (YYYY-MM-DD);Ativo;Setor;Quantidade;Preço Unitário;Link da Nota\n2023-10-15;BBAS3;Bancos;10;45.50;https://linkdanota.com\n';
    downloadCSV(csv, 'modelo_aportes.csv');
}

function baixarModeloDividendos() {
    const csv = 'Data (YYYY-MM-DD);Ativo;Valor Recebido;Descrição\n2023-10-20;BBAS3;15.50;JCP\n';
    downloadCSV(csv, 'modelo_dividendos.csv');
}

// ========== IMPORTAR ==========
function importarAportes(arquivo) {
    if (!arquivo) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const linhas = e.target.result.split(/\r?\n/);
        let importados = 0;
        for (let i = 1; i < linhas.length; i++) {
            const linha = linhas[i].trim();
            if (!linha) continue;
            const colunas = linha.split(';').map(c => c.trim());
            if (colunas.length < 5) continue;
            await gerenciador.adicionar({
                dataCompra: colunas[0],
                codigoAtivo: colunas[1].toUpperCase(),
                setorAporte: colunas[2],
                quantidade: parseInt(colunas[3]),
                precoPago: parseFloat(colunas[4]),
                nota: colunas[5] || ''
            });
            importados++;
        }
        mostrarAlerta(`${importados} aporte(s) importado(s) com sucesso!`);
        await atualizarInterface();
        document.getElementById('fileImportAportes').value = '';
    };
    reader.readAsText(arquivo);
}

function importarDividendos(arquivo) {
    if (!arquivo) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const linhas = e.target.result.split(/\r?\n/);
        let importados = 0;
        for (let i = 1; i < linhas.length; i++) {
            const linha = linhas[i].trim();
            if (!linha) continue;
            const colunas = linha.split(';').map(c => c.trim());
            if (colunas.length < 3) continue;
            await gDividendos.adicionar({
                dataPagamento: colunas[0],
                codigoDividendo: colunas[1].toUpperCase(),
                valorDividendo: parseFloat(colunas[2]),
                descricaoDividendo: colunas[3] || ''
            });
            importados++;
        }
        mostrarAlerta(`${importados} dividendo(s) importado(s) com sucesso!`);
        await atualizarInterface();
        document.getElementById('fileImportDividendos').value = '';
    };
    reader.readAsText(arquivo);
}

// ========== ATUALIZAR INTERFACE ==========
async function atualizarInterface() {
    atualizarResumoGeral();
    atualizarTabelaAportes();
    atualizarTabelaDividendos();
    atualizarGraficos();
    await atualizarCarteiraConsolidada();
    await atualizarRadar();
}

// ========== INICIALIZAÇÃO ==========
async function inicializar() {
    await gerenciador.carregarDados();
    await gDividendos.carregarDados();
    await gerenciadorRadar.carregarDados();
    // Definir data de hoje nos campos de data
    const dataHoje = new Date();
    const dataAporte = document.getElementById('dataAporte');
    const dataPagamento = document.getElementById('dataPagamento');
    if (dataAporte) dataAporte.valueAsDate = dataHoje;
    if (dataPagamento) dataPagamento.valueAsDate = dataHoje;
    await atualizarInterface();
}
