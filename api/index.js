// Vercel统一API处理
const DouyinAPIDirect = require('../videoextraction/douyin-api-direct');
const axios = require('axios');

module.exports = async (req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    
    try {
        if (pathname === '/api/parse-douyin' && req.method === 'POST') {
            // 抖音视频解析
            const { url } = req.body;
            
            if (!url) {
                res.status(400).json({
                    success: false,
                    error: '缺少URL参数'
                });
                return;
            }
            
            console.log('🔍 开始解析链接:', url);
            
            const douyinAPI = new DouyinAPIDirect();
            const result = await douyinAPI.parseVideoInfo(url);
            
            console.log('✅ 解析成功:', result.success ? '是' : '否');
            res.json(result);
            
        } else if (pathname === '/api/expand-url' && req.method === 'GET') {
            // URL展开
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
            
        } else {
            res.status(404).json({ error: 'API endpoint not found' });
        }
        
    } catch (error) {
        console.error('❌ API错误:', error.message);
        res.status(500).json({
            success: false,
            error: '服务器内部错误',
            details: error.message
        });
    }
};
