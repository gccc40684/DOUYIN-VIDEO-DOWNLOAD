// Vercel API函数：抖音视频解析（CommonJS版本）
const axios = require('axios');

module.exports = async function handler(req, res) {
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
        
        // 使用axios解析抖音视频
        const result = await parseDouyinVideoWithAxios(url);
        
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

// 使用axios解析抖音视频
async function parseDouyinVideoWithAxios(url) {
    try {
        // 尝试多个API端点
        const apiEndpoints = [
            {
                url: 'https://api.snapany.com/api/dy/info',
                method: 'POST',
                data: { url: url }
            },
            {
                url: 'https://api.douyin.wtf/api',
                method: 'POST', 
                data: { url: url }
            },
            {
                url: 'https://api.tikwm.com/api',
                method: 'POST',
                data: { url: url }
            }
        ];
        
        for (const api of apiEndpoints) {
            try {
                console.log(`🔄 尝试API: ${api.url}`);
                
                const response = await axios({
                    url: api.url,
                    method: api.method,
                    data: api.data,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
                        'Accept': 'application/json',
                        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                });
                
                if (response.status === 200 && response.data) {
                    const data = response.data;
                    console.log(`✅ API ${api.url} 成功`);
                    
                    // 标准化返回格式
                    return {
                        success: true,
                        data: {
                            title: data.title || data.desc || '视频标题',
                            author: data.author || data.nickname || '作者',
                            videoId: data.video_id || data.aweme_id || '123456789',
                            publishTime: data.create_time || new Date().toISOString(),
                            likeCount: data.digg_count || data.like_count || 0,
                            commentCount: data.comment_count || 0,
                            shareCount: data.share_count || 0,
                            content: data.desc || data.title || '视频描述',
                            videoUrl: data.play || data.video_url || data.url || ''
                        }
                    };
                }
            } catch (apiError) {
                console.log(`❌ API ${api.url} 失败:`, apiError.message);
                continue;
            }
        }
        
        // 如果所有API都失败，返回错误
        return {
            success: false,
            error: '所有API端点都无法访问，请稍后重试',
            details: '可能是网络问题或API服务暂时不可用'
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}