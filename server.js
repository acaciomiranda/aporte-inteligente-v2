/**
 * =============================================================================
 * APORTE INTELIGENTE — v2 | Backend / Servidor Express
 * =============================================================================
 * Responsabilidades deste arquivo:
 *  1. Servir os arquivos estáticos do frontend (index.html, script.js, style.css)
 *  2. Expor a API REST para Aportes, Dividendos e Radar (CRUD completo)
 *  3. Atuar como proxy seguro para a API Brapi (cotações B3 em tempo real),
 *     mantendo o token da API fora do código do frontend
 *
 * Stack: Node.js + Express 5 + better-sqlite3 + dotenv
 *
 * Para iniciar: node server.js
 * Acesso local:  http://localhost:3000
 * =============================================================================
 */

const express = require('express');
const cors    = require('cors');
const dotenv  = require('dotenv');
const db      = require('./database/db');
const path    = require('path');

// Carrega variáveis de ambiente do arquivo .env (BRAPI_TOKEN, PORT)
dotenv.config();

const app         = express();
const PORT        = process.env.PORT || 3000;
const BRAPI_TOKEN = process.env.BRAPI_TOKEN;

app.use(cors());
app.use(express.json());

// Serve a pasta frontend/public como raiz do site (index.html, style.css, script.js)
app.use(express.static(path.join(__dirname, '../frontend/public')));

// =============================================================================
// PROXY BRAPI — protege o token da API fora do JavaScript do navegador
// GET /api/quote/:codigo
// =============================================================================
app.get('/api/quote/:codigo', async (req, res) => {
    try {
        const { codigo } = req.params;
        const token = BRAPI_TOKEN || '';

        if (!token) {
            return res.status(503).json({ error: 'Token da Brapi não configurado. Crie o arquivo .env com BRAPI_TOKEN=' });
        }

        const response = await fetch(`https://brapi.dev/api/quote/${codigo}?token=${token}`);

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Erro ao consultar a Brapi' });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Erro no Proxy Brapi:', error);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

// =============================================================================
// API DE APORTES — CRUD completo
// Tabela: aportes (id, codigoAtivo, setorAporte, quantidade, precoPago, dataCompra, nota)
// =============================================================================
app.get('/api/aportes', (req, res) => {
    const stmt = db.prepare('SELECT * FROM aportes ORDER BY dataCompra DESC');
    res.json(stmt.all());
});

app.post('/api/aportes', (req, res) => {
    const { codigoAtivo, setorAporte, quantidade, precoPago, dataCompra, nota } = req.body;
    const stmt = db.prepare(`
        INSERT INTO aportes (codigoAtivo, setorAporte, quantidade, precoPago, dataCompra, nota)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(codigoAtivo, setorAporte, quantidade, precoPago, dataCompra, nota);
    res.json({ id: info.lastInsertRowid, ...req.body });
});

app.put('/api/aportes/:id', (req, res) => {
    const { id } = req.params;
    const { codigoAtivo, setorAporte, quantidade, precoPago, dataCompra, nota } = req.body;
    const stmt = db.prepare(`
        UPDATE aportes
        SET codigoAtivo = ?, setorAporte = ?, quantidade = ?, precoPago = ?, dataCompra = ?, nota = ?
        WHERE id = ?
    `);
    stmt.run(codigoAtivo, setorAporte, quantidade, precoPago, dataCompra, nota, id);
    res.json({ id: Number(id), ...req.body });
});

app.delete('/api/aportes/:id', (req, res) => {
    const stmt = db.prepare('DELETE FROM aportes WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
});

// =============================================================================
// API DE DIVIDENDOS — CRUD completo
// Tabela: dividendos (id, codigoDividendo, valorDividendo, dataPagamento, descricaoDividendo)
// =============================================================================
app.get('/api/dividendos', (req, res) => {
    const stmt = db.prepare('SELECT * FROM dividendos ORDER BY dataPagamento DESC');
    res.json(stmt.all());
});

app.post('/api/dividendos', (req, res) => {
    const { codigoDividendo, valorDividendo, dataPagamento, descricaoDividendo } = req.body;
    const stmt = db.prepare(`
        INSERT INTO dividendos (codigoDividendo, valorDividendo, dataPagamento, descricaoDividendo)
        VALUES (?, ?, ?, ?)
    `);
    const info = stmt.run(codigoDividendo, valorDividendo, dataPagamento, descricaoDividendo);
    res.json({ id: info.lastInsertRowid, ...req.body });
});

app.put('/api/dividendos/:id', (req, res) => {
    const { id } = req.params;
    const { codigoDividendo, valorDividendo, dataPagamento, descricaoDividendo } = req.body;
    const stmt = db.prepare(`
        UPDATE dividendos
        SET codigoDividendo = ?, valorDividendo = ?, dataPagamento = ?, descricaoDividendo = ?
        WHERE id = ?
    `);
    stmt.run(codigoDividendo, valorDividendo, dataPagamento, descricaoDividendo, id);
    res.json({ id: Number(id), ...req.body });
});

app.delete('/api/dividendos/:id', (req, res) => {
    const stmt = db.prepare('DELETE FROM dividendos WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
});

// =============================================================================
// API DO RADAR DE OPORTUNIDADES — CRUD
// Tabela: radar (id, codigo UNIQUE, precoTeto, dataCriacao)
// =============================================================================
app.get('/api/radar', (req, res) => {
    const stmt = db.prepare('SELECT * FROM radar ORDER BY dataCriacao DESC');
    res.json(stmt.all());
});

app.post('/api/radar', (req, res) => {
    const { codigo, precoTeto } = req.body;
    const dataCriacao = new Date().toISOString();

    try {
        const stmt = db.prepare(`
            INSERT INTO radar (codigo, precoTeto, dataCriacao)
            VALUES (?, ?, ?)
        `);
        const info = stmt.run(codigo.toUpperCase(), precoTeto, dataCriacao);
        res.json({ id: info.lastInsertRowid, codigo, precoTeto, dataCriacao });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(400).json({ error: 'Ação já existe no radar' });
        } else {
            res.status(500).json({ error: 'Erro ao adicionar ao radar' });
        }
    }
});

app.delete('/api/radar/:id', (req, res) => {
    const stmt = db.prepare('DELETE FROM radar WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
});

// =============================================================================
// INICIAR SERVIDOR
// =============================================================================
app.listen(PORT, () => {
    console.log(`\n🚀 Aporte Inteligente v2 rodando!`);
    console.log(`   Acesse: http://localhost:${PORT}\n`);
    if (!BRAPI_TOKEN) {
        console.warn(`⚠️  ATENÇÃO: Token da Brapi não configurado.`);
        console.warn(`   Crie o arquivo backend/.env com: BRAPI_TOKEN=seu_token\n`);
    }
});
