export default async function handler(req, res) {
  if (req.method === 'GET') {
    const projects = [
      {
        id: "proj_001",
        name: "E-commerce Website",
        type: "Web Application",
        status: "completed",
        lastModified: "2025-08-01T10:30:00Z",
        bugsFound: 3,
        bugsFixed: 3,
        codebase: "https://github.com/user/ecommerce-app",
        language: "JavaScript/React"
      },
      {
        id: "proj_002",
        name: "Mobile API Backend",
        type: "API Service",
        status: "in-progress",
        lastModified: "2025-08-02T14:15:00Z",
        bugsFound: 2,
        bugsFixed: 1,
        codebase: "https://gitlab.com/user/mobile-api",
        language: "Python/Django"
      }
    ];
    
    res.json({ success: true, projects });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
