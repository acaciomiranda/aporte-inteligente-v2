# 📈 Aporte Inteligente — v2 (Full-Stack)

<p align="center">
  <img src="https://img.shields.io/badge/Status-v2.0%20Full--Stack-success?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge&logo=nodedotjs" alt="Node.js">
  <img src="https://img.shields.io/badge/Banco-SQLite-blue?style=for-the-badge&logo=sqlite" alt="SQLite">
  <img src="https://img.shields.io/badge/CSS3-Mobile--First-blueviolet?style=for-the-badge&logo=css3" alt="CSS">
</p>

O **Aporte Inteligente v2** é a evolução do cockpit financeiro pessoal para investidores de **Buy and Hold** focados na geração de **Renda Passiva**. Esta versão migrou de uma aplicação estática com `localStorage` para uma arquitectura **Full-Stack** com backend Node.js + Express e banco de dados SQLite persistente.

---

## 🆕 Novidades da v2 (em relação à v1)

| Recurso | v1 (Estática) | v2 (Full-Stack) |
|---|---|---|
| **Armazenamento** | `localStorage` do navegador | SQLite (arquivo permanente no HD) |
| **Acesso** | Duplo clique no `.html` | Servidor Node.js local (`http://localhost:3000`) |
| **Token da API** | Exposto no `script.js` | Seguro em variável de ambiente `.env` |
| **Dados** | Perdidos se limpar o cache | Persistem indefinidamente em `app.db` |
| **Layout Mobile** | Parcialmente responsivo | Mobile-First: 4 breakpoints (480/768/1024/1025+px) |
| **Botões** | Escopo de função com bugs | Todas as funções expostas via `window.*` |
| **Cotações** | Chamada direta do browser | Proxy seguro pelo backend (protege o token) |

---

## ✨ Funcionalidades

### 💼 Gestão de Carteira
- **Carteira Consolidada:** Preço Médio, Quantidade, Cotação Atual, Total e Lucro/Prejuízo em tempo real
- **YoC (Yield on Cost):** Retorno real dos dividendos sobre o capital investido por ativo
- **Categorização por Setor:** Organização para rebalanceamento eficiente

### 📊 Visualização e Relatórios
- **4 Gráficos Interativos:** Composição da Carteira, Valor por Ativo, Composição por Setor e Evolução de Dividendos
- **Copiar Gráficos:** Exporta card em PNG direto para a área de transferência
- **Resumo Geral:** Total Investido, Total em Dividendos e Rentabilidade Acumulada

### 🎯 Estratégia e Monitoramento
- **Radar de Oportunidades:** Monitore ativos com Preço Teto (estratégia Bazin/Barsi)
- **Sinais Automáticos:** 🟢 Comprar / 🔴 Aguardar via cotações reais da Brapi

### 📥 Importação e Exportação CSV
- Exportação de Aportes e Dividendos com BOM UTF-8 (compatível com Excel)
- Importação robusta com suporte a quebras de linha Windows/Mac/Linux
- Modelos de CSV prontos para preenchimento

### 📱 Layout Responsivo (Mobile-First)
- Gráficos com altura controlada por breakpoint (não estouram a tela)
- Tabelas com scroll horizontal suave (touch nativo no iOS/Android)
- Botões CSV com `flex-wrap` — adaptam-se a qualquer largura de tela
- `touch-action: manipulation` — elimina delay de 300ms nos taps

---

## 🏗️ Estrutura do Projeto

```text
v2/
├── backend/
│   ├── database/
│   │   ├── app.db          ← Banco SQLite (gerado automaticamente)
│   │   └── db.js           ← Inicialização e esquema do banco
│   ├── node_modules/       ← Dependências
│   ├── package.json        ← Manifesto Node.js e dependências
│   ├── package-lock.json   ← Lock de versões das dependências
│   └── server.js           ← API REST (Express) + proxy Brapi + arquivos estáticos
│
├── frontend/
│   └── public/
│       ├── favicon.png     ← Ícone da aba do navegador
│       ├── index.html      ← HTML semântico da interface
│       ├── manifest.json   ← Configuração PWA (instalação como app)
│       ├── script.js       ← Toda a lógica do frontend (funções no window.*)
│       └── style.css       ← CSS Mobile-First com 4 breakpoints
│
└── README.md               ← Esta documentação
```

---

## 🚀 Tecnologias Utilizadas

### Backend
- **Node.js** + **Express 5** — servidor HTTP e API REST
- **better-sqlite3** — banco de dados SQLite síncrono e rápido
- **dotenv** — variáveis de ambiente seguras para o token da Brapi
- **cors** — permissão de origens cruzadas para desenvolvimento local

### Frontend
- **JavaScript Vanilla** — sem frameworks, máxima performance
- **Chart.js 3.9** — gráficos interativos e responsivos
- **html2canvas 1.4** — captura de gráficos como imagem PNG
- **CSS3 Mobile-First** — Flexbox + Grid com 4 breakpoints definidos

### Integrações
- **Brapi API** (`brapi.dev`) — cotações reais da B3 em tempo real

---

## ⚙️ Como Executar

### Pré-requisitos
- [Node.js](https://nodejs.org/) versão 18 ou superior instalado

### 1. Instalar dependências (apenas na primeira vez)
```bash
cd backend
npm install
```

### 2. Configurar o Token da Brapi (opcional, mas recomendado)
Crie o arquivo `backend/.env` com o conteúdo:
```env
BRAPI_TOKEN=seu_token_aqui
PORT=3000
```
> Crie sua conta gratuita em [brapi.dev](https://brapi.dev) para obter o token.  
> Sem o token, as cotações em tempo real não funcionarão, mas o restante da aplicação opera normalmente.

### 3. Iniciar o servidor
```bash
cd backend
node server.js
```

### 4. Acessar no navegador
```
http://localhost:3000
```

> ⚠️ **Importante:** O servidor deve estar rodando sempre que você quiser usar o aplicativo. Se fechar o terminal, o servidor para. Basta rodar `node server.js` novamente.

---

## 🗄️ Banco de Dados

O arquivo `app.db` é criado automaticamente na pasta `backend/database/` na primeira vez que o servidor é iniciado. As tabelas criadas são:

| Tabela | Descrição |
|---|---|
| `aportes` | Histórico de compras de ativos (código, setor, quantidade, preço, data, nota) |
| `dividendos` | Registro de dividendos e JCP recebidos (ativo, valor, data, descrição) |
| `radar` | Lista de ativos monitorados com Preço Teto |

> **Backup:** Para fazer backup dos seus dados, basta copiar o arquivo `app.db`.

---

## 🔌 Rotas da API

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/aportes` | Lista todos os aportes |
| `POST` | `/api/aportes` | Adiciona um novo aporte |
| `PUT` | `/api/aportes/:id` | Edita um aporte existente |
| `DELETE` | `/api/aportes/:id` | Remove um aporte |
| `GET` | `/api/dividendos` | Lista todos os dividendos |
| `POST` | `/api/dividendos` | Registra um novo dividendo |
| `PUT` | `/api/dividendos/:id` | Edita um dividendo existente |
| `DELETE` | `/api/dividendos/:id` | Remove um dividendo |
| `GET` | `/api/radar` | Lista o radar de oportunidades |
| `POST` | `/api/radar` | Adiciona ativo ao radar |
| `DELETE` | `/api/radar/:id` | Remove ativo do radar |
| `GET` | `/api/quote/:codigo` | Proxy seguro para cotação Brapi |

---

## 🐛 Problemas Conhecidos e Soluções

### A página não abre / "Não foi possível conectar"
→ O servidor não está rodando. Abra o terminal na pasta `backend/` e execute `node server.js`.

### Os botões não funcionam após copiar os arquivos
→ Certifique-se de que os 3 arquivos (`index.html`, `script.js`, `style.css`) estão na mesma pasta.  
→ Nunca abra o `index.html` com duplo clique — acesse sempre via `http://localhost:3000`.

### Cotações mostram "Indisponível"
→ Verifique se o arquivo `.env` existe na pasta `backend/` com um token válido da Brapi.

### Dados sumidos
→ Verifique se o arquivo `app.db` ainda existe na pasta `backend/database/`.  
→ Nunca delete esse arquivo — ele contém toda a sua carteira.

---

## 🤝 Créditos

Este projeto foi desenvolvido como ferramenta pessoal de gestão de patrimônio e busca pela independência financeira.

> [!NOTE]
> O desenvolvimento da v1 e da v2 contou com o auxílio de Inteligência Artificial (**Gemini** e **Claude**) para estruturação lógica, refatoração de código, correção de bugs de escopo JavaScript e otimização de UI/UX responsivo.

---

<p align="center">
  <i>Construindo patrimônio e renda passiva no longo prazo.</i> 📈
</p>
