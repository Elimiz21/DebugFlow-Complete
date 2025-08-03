export default function handler(req, res) {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '2.1.0',
    services: {
      ai: !!process.env.OPENAI_API_KEY,
      github: !!process.env.GITHUB_TOKEN,
      testing: true,
      implementation: true
    }
  });
}
