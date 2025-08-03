export default function handler(req, res) {
  if (req.method === 'GET') {
    // For now, just return connection status
    res.status(200).json({
      connected: true,
      message: 'Socket connection simulated',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
