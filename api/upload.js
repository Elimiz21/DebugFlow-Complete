export default function handler(req, res) {
  if (req.method === 'POST') {
    return res.status(200).json({
      success: true,
      message: 'File upload simulated',
      projectId: `proj_${Date.now()}`,
      timestamp: new Date().toISOString()
    });
  }
  res.status(405).json({ error: 'Method not allowed' });
}
