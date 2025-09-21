// Vercel API函数：URL展开
const axios = require('axios');

export default async function handler(req, res) {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // 只允许GET请求
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    
    try {
        const { url } = req.query;
        
        if (!url) {
            res.status(400).json({
                success: false,
                error: '缺少URL参数'
            });
            return;
        }
        
        const response = await axios.get(url, {
            maxRedirects: 5,
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
            }
        });

        res.json({
            success: true,
            expandedUrl: response.request.res.responseUrl || url
        });
        
    } catch (error) {
        console.error('❌ URL展开失败:', error.message);
        res.json({
            success: false,
            error: error.message,
            expandedUrl: req.query.url
        });
    }
}
