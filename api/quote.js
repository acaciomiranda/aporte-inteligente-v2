export default async function handler(req, res) {
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
