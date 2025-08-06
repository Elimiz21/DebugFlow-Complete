import socketServer from '../server/socketServer.js';

export default function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      return handleGetSocketStatus(req, res);
    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({
        success: false,
        message: `Method ${method} not allowed`
      });
  }
}

function handleGetSocketStatus(req, res) {
  try {
    const stats = socketServer.getServerStats();
    
    return res.status(200).json({
      success: true,
      connected: true,
      socketServer: {
        initialized: !!socketServer.io,
        stats: stats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Socket status error:', error);
    return res.status(500).json({
      success: false,
      connected: false,
      message: 'Socket server error',
      timestamp: new Date().toISOString()
    });
  }
}
