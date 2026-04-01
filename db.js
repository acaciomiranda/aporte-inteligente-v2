/**
 * =============================================================================
 * APORTE INTELIGENTE — v2 | Inicialização do Banco de Dados (SQLite)
 * =============================================================================
 * Utiliza a biblioteca better-sqlite3 para criar e manter o arquivo app.db.
 *
 * O banco é criado automaticamente na primeira execução do servidor.
 * O arquivo app.db fica em: backend/database/app.db
 *
 * IMPORTANTE: Para fazer backup de todos os seus dados, basta copiar o
 * arquivo app.db para um local de segurança.
 *
 * Tabelas:
 *  - aportes    → Histórico de compras de ativos na B3
 *  - dividendos → Registro de dividendos e JCP recebidos
 *  - radar      → Ativos monitorados com Preço Teto (estratégia Bazin/Barsi)
 * =============================================================================
 */

const Database = require('better-sqlite3');
const path     = require('path');

// Caminho absoluto para o arquivo do banco de dados
const dbPath = path.resolve(__dirname, 'app.db');

// Abre ou cria o arquivo .db (verbose: false em produção para não poluir o terminal)
const db = new Database(dbPath, { verbose: false });

/**
 * Inicializa o esquema do banco de dados.
 * Usa CREATE TABLE IF NOT EXISTS — seguro para rodar em qualquer inicialização.
 */
const initDB = () => {
    db.exec(`
        -- Histórico de aportes (compras) de ativos da B3
        CREATE TABLE IF NOT EXISTS aportes (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            codigoAtivo TEXT    NOT NULL,          -- ex: BBAS3, ITUB4
            setorAporte TEXT    NOT NULL,          -- ex: Bancos, FII, Energia
            quantidade  INTEGER NOT NULL,          -- número de cotas/ações compradas
            precoPago   REAL    NOT NULL,          -- preço unitário pago (R$)
            dataCompra  TEXT    NOT NULL,          -- formato YYYY-MM-DD
            nota        TEXT                       -- link opcional da nota de corretagem
        );

        -- Registro de dividendos e JCP recebidos
        CREATE TABLE IF NOT EXISTS dividendos (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            codigoDividendo     TEXT    NOT NULL,  -- código do ativo que pagou
            valorDividendo      REAL    NOT NULL,  -- valor total recebido (R$)
            dataPagamento       TEXT    NOT NULL,  -- formato YYYY-MM-DD
            descricaoDividendo  TEXT               -- ex: JCP, Dividendo, Fração
        );

        -- Radar de oportunidades: ativos monitorados com preço teto
        CREATE TABLE IF NOT EXISTS radar (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo       TEXT    NOT NULL UNIQUE,  -- código único do ativo
            precoTeto    REAL    NOT NULL,          -- preço teto definido pelo investidor
            dataCriacao  TEXT    NOT NULL           -- data/hora de inclusão no radar
        );
    `);
};

initDB();

module.exports = db;
