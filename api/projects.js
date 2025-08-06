export default function handler(req, res) {
  if (req.method === 'GET') {
    const sampleProjects = [
      {
        id: 'proj_1',
        name: 'E-commerce Website',
        type: 'Web Application',
        status: 'completed',
        bugsFound: 12,
        bugsFixed: 12,
        language: 'JavaScript'
      },
      {
        id: 'proj_2',
        name: 'Mobile API Backend',
        type: 'API Service',
        status: 'in-progress',
        bugsFound: 8,
        bugsFixed: 5,
        language: 'Python'
      }
    ];

    return res.status(200).json({
      success: true,
      projects: sampleProjects,
      count: sampleProjects.length
    });
  }
  res.status(405).json({ error: 'Method not allowed' });
}
