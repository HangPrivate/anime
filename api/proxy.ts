import type { VercelRequest, VercelResponse } from '@vercel/node';

const BASE_URL = 'https://www.sankavollerei.com/anime';

const ALLOWED_PATHS = [
  '/home',
  '/schedule',
  '/unlimited',
  '/anime/',
  '/search/',
  '/episode/',
  '/server/',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let path = req.query.path;
  
  // Handle array or string path
  if (Array.isArray(path)) {
    path = '/' + path.join('/');
  } else if (typeof path !== 'string') {
    return res.status(400).json({ error: 'Path is required' });
  } else if (!path.startsWith('/')) {
    path = '/' + path;
  }

  // Validate path for security
  const isAllowed = ALLOWED_PATHS.some(allowed => path!.startsWith(allowed));
  if (!isAllowed) {
    return res.status(403).json({ error: 'Path not allowed', path });
  }

  try {
    const targetUrl = `${BASE_URL}${path}`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'aniwave/1.0',
        'Accept': 'application/json',
        'Referer': 'https://aniwave.vercel.app',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Upstream error',
        status: response.status,
        statusText: response.statusText
      });
    }

    const data = await response.json();
    
    // Cache for 5 minutes, allow stale for 10 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Proxy error:', error);
    
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Request timeout' });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
