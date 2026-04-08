export default async function handler(req, res) {
    // Permissões de CORS (Evita bloqueios de segurança do navegador em testes locais ou requisições externas)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Lida com a requisição de pré-verificação (Preflight) do CORS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { codigo } = req.query;
    const token = process.env.BRAPI_TOKEN; // Puxa do cofre do Vercel

    if (!codigo) {
        return res.status(400).json({ error: 'Código do ativo não fornecido.' });
    }

    try {
        const response = await fetch(`https://brapi.dev/api/quote/${codigo}?token=${token}`);
        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar cotação na Brapi.' });
    }
}
