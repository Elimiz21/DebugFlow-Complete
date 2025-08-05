export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      connected: true,
      message: 'Socket connection simulated',
      timestamp: new Date().toISOString()
    });
  }
  res.status(405).json({ error: 'Method not allowed' });
}
