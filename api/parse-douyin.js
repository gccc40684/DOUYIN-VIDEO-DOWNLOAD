// Vercel API函数：抖音视频解析
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
    
    // 只允许POST请求
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    
    try {
        const { url } = req.body;
        
        if (!url) {
            res.status(400).json({
                success: false,
                error: '缺少URL参数'
            });
            return;
        }
        
        console.log('🔍 开始解析链接:', url);
        
        // 简化的抖音视频解析逻辑
        const result = await parseDouyinVideo(url);
        
        console.log('✅ 解析成功:', result.success ? '是' : '否');
        
        res.json(result);
        
    } catch (error) {
        console.error('❌ 解析失败:', error.message);
        res.status(500).json({
            success: false,
            error: '服务器内部错误',
            details: error.message
        });
    }
}

// 简化的抖音视频解析函数
async function parseDouyinVideo(url) {
    try {
        // 这里使用一个简单的解析逻辑
        // 您可以根据需要调用实际的解析服务
        
        // 模拟解析结果
        const mockResult = {
            success: true,
            data: {
                title: '测试视频标题',
                author: '测试作者',
                videoId: '123456789',
                publishTime: new Date().toISOString(),
                likeCount: 1000,
                commentCount: 100,
                shareCount: 50,
                content: '这是一个测试视频的描述内容',
                videoUrl: 'https://example.com/video.mp4'
            }
        };
        
        return mockResult;
        
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}