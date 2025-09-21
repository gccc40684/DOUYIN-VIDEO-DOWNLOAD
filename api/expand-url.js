// Vercel API函数：URL展开（无外部依赖版本）
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
        
        // 使用原生fetch展开URL
        const expandedUrl = await expandUrlWithFetch(url);
        
        res.json({
            success: true,
            expandedUrl: expandedUrl
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

// 使用原生fetch展开URL
async function expandUrlWithFetch(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
            }
        });
        
        return response.url || url;
        
    } catch (error) {
        console.error('URL展开失败:', error.message);
        return url; // 返回原始URL
    }
}