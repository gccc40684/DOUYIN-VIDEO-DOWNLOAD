// 简单的本地代理服务器
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const DouyinAPIDirect = require('./videoextraction/douyin-api-direct');
// const VideoContentExtractor = require('./video-content-extractor'); // 已注释（文案提取功能已禁用）

const app = express();
const PORT = 3000;

// 启用CORS
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// 初始化抖音API解析器
const douyinAPI = new DouyinAPIDirect();
// const contentExtractor = new VideoContentExtractor(); // 已注释（文案提取功能已禁用）

// 抖音短链接展开
app.get('/api/expand-url', async (req, res) => {
    try {
        const { url } = req.query;
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
        res.json({
            success: false,
            error: error.message,
            expandedUrl: req.query.url
        });
    }
});

// 抖音视频解析代理 - 增强版
app.post('/api/parse-douyin', async (req, res) => {
    try {
        const { url } = req.body;
        console.log('🔍 开始解析链接:', url);

        // 先展开短链接
        let fullUrl = url;
        if (url.includes('v.douyin.com')) {
            try {
                console.log('📤 展开短链接...');
                const expandResponse = await axios.get(url, {
                    maxRedirects: 10,
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                        'Cache-Control': 'no-cache'
                    }
                });
                fullUrl = expandResponse.request.res.responseUrl || url;
                console.log('✅ 展开后的链接:', fullUrl);
            } catch (e) {
                console.log('⚠️ 短链接展开失败，尝试其他方式:', e.message);
            }
        }

        // 提取视频ID - 改进版
        const videoId = extractVideoIdEnhanced(fullUrl);
        console.log('🎯 提取到视频ID:', videoId);

        // 使用免费API方案 + 重试机制
        let apiResults = null;
        const maxRetries = 5;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 尝试获取视频信息 (第${attempt}次/共${maxRetries}次)...`);
                
                // 方案1: 直接API调用
                apiResults = await douyinAPI.getVideoInfo(fullUrl);
                
                if (apiResults && apiResults.success) {
                    console.log(`✅ 第${attempt}次尝试成功获取视频信息`);
                    return res.json({
                        success: true,
                        data: apiResults,
                        attempt: attempt
                    });
                }
                
                // 方案2: 备用API方案
                apiResults = await tryMultipleApis(videoId, fullUrl);
                
                if (apiResults && apiResults.success) {
                    console.log(`✅ 第${attempt}次尝试成功获取视频信息 (备用方案)`);
                    return res.json({
                        success: true,
                        data: apiResults,
                        attempt: attempt
                    });
                }
                
                console.log(`⚠️ 第${attempt}次尝试失败，准备重试...`);
                
                // 如果不是最后一次尝试，等待一段时间再重试
                if (attempt < maxRetries) {
                    const delay = attempt * 1000; // 递增延迟：1秒、2秒、3秒、4秒
                    console.log(`⏳ 等待 ${delay}ms 后重试...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
            } catch (error) {
                console.log(`❌ 第${attempt}次尝试出错:`, error.message);
                
                if (attempt < maxRetries) {
                    const delay = attempt * 1000;
                    console.log(`⏳ 等待 ${delay}ms 后重试...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // 所有API重试都失败
        console.log('❌ 所有抖音官方API都失败');

        // 所有方案都失败
        console.log(`❌ 经过${maxRetries}次重试和网页解析，所有方案都失败`);
        res.json({
            success: false,
            error: `经过${maxRetries}次重试仍无法获取视频信息，请检查链接是否正确或稍后重试`,
            videoId: videoId,
            attempts: maxRetries,
            data: {
                author: '未知作者',
                publishTime: new Date().toLocaleDateString('zh-CN'),
                likeCount: 0,
                description: `链接解析结果：\n原始链接: ${url}\n展开链接: ${fullUrl}\n视频ID: ${videoId}\n\n可能的原因：\n1. 视频需要登录才能查看\n2. 视频地区限制\n3. 抖音更新了反爬机制\n4. 网络连接问题\n\n建议：手动复制视频文案`,
                videoUrl: '',
                videoId: videoId
            }
        });

    } catch (error) {
        console.error('❌ 服务器错误:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: '服务器内部错误'
        });
    }
});

// 增强的视频ID提取
function extractVideoIdEnhanced(url) {
    console.log('🔍 从URL提取视频ID:', url);

    const patterns = [
        /\/video\/(\d+)/,
        /\/share\/video\/(\d+)/,
        /aweme_id=(\d+)/,
        /modal_id=(\d+)/,
        /\/(\d{19})/,  // 19位数字ID
        /\/(\d{18})/,  // 18位数字ID
        /item_ids=(\d+)/,
        /\/note\/(\d+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            console.log(`✅ 匹配模式 ${pattern}: ${match[1]}`);
            return match[1];
        }
    }

    // 如果无法提取，生成一个基于时间的ID
    const fallbackId = Date.now().toString();
    console.log('⚠️ 无法提取ID，使用备用ID:', fallbackId);
    return fallbackId;
}

// 尝试多个API端点
async function tryMultipleApis(videoId, fullUrl) {
    const apis = [
        // 官方API - 方法1
        {
            name: '抖音官方API v2',
            url: `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`,
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
                'Referer': 'https://www.douyin.com/',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'zh-CN,zh;q=0.9',
                'Cache-Control': 'no-cache',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-site'
            }
        },
        // 官方API - 方法2
        {
            name: '抖音移动端API',
            url: `https://www.douyin.com/aweme/v1/web/aweme/detail/?aweme_id=${videoId}`,
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
                'Referer': 'https://www.douyin.com/',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        }
    ];

    for (const api of apis) {
        try {
            console.log(`🔄 尝试 ${api.name}...`);
            const response = await axios.get(api.url, {
                headers: api.headers,
                timeout: 15000,
                validateStatus: (status) => status < 500 // 接受4xx状态码
            });

            console.log(`📊 ${api.name} 响应状态:`, response.status);

            if (response.data && response.data.item_list && response.data.item_list.length > 0) {
                const item = response.data.item_list[0];
                return formatVideoData(item);
            } else if (response.data && response.data.aweme_detail) {
                return formatVideoData(response.data.aweme_detail);
            } else {
                console.log(`⚠️ ${api.name} 返回数据格式异常:`, Object.keys(response.data || {}));
            }
        } catch (error) {
            console.log(`❌ ${api.name} 失败:`, error.message);
            if (error.response) {
                console.log(`   状态码: ${error.response.status}`);
                console.log(`   响应头:`, Object.keys(error.response.headers));
            }
        }
    }

    return null;
}

// 尝试网页内容解析
async function tryWebScraping(url) {
    try {
        console.log('🌐 尝试网页内容解析...');
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9',
                'Cache-Control': 'no-cache'
            },
            timeout: 15000
        });

        const html = response.data;

        // 尝试从HTML中提取信息
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const descMatch = html.match(/data-desc="([^"]+)"/i) || html.match(/description[^>]*content="([^"]+)"/i);
        const authorMatch = html.match(/data-author="([^"]+)"/i) || html.match(/"nickname":"([^"]+)"/i);

        if (titleMatch || descMatch) {
            return {
                success: true,
                author: authorMatch ? authorMatch[1] : '网页解析',
                publishTime: new Date().toLocaleDateString('zh-CN'),
                likeCount: 0,
                description: descMatch ? descMatch[1] : titleMatch[1] || '通过网页解析获取',
                videoUrl: '',
                videoId: extractVideoIdEnhanced(url)
            };
        }
    } catch (error) {
        console.log('❌ 网页解析失败:', error.message);
    }

    return null;
}

function formatVideoData(item) {
    return {
        author: item.author?.nickname || '未知作者',
        publishTime: item.create_time ?
            new Date(item.create_time * 1000).toLocaleDateString('zh-CN') :
            '未知时间',
        likeCount: item.statistics?.digg_count || 0,
        description: item.desc || item.content || '无描述',
        videoUrl: getVideoUrl(item),
        coverUrl: item.video?.cover?.url_list?.[0] || '',
        videoId: item.aweme_id
    };
}

function extractVideoId(url) {
    const patterns = [
        /\/video\/(\d+)/,
        /\/share\/video\/(\d+)/,
        /aweme_id=(\d+)/,
        /modal_id=(\d+)/,
        /\/(\d{19})/  // 19位数字ID
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }

    // 如果无法提取，返回时间戳
    return Date.now().toString();
}

function getVideoUrl(item) {
    const video = item.video;
    if (!video) return '';

    // 尝试不同的视频地址字段
    return video.play_addr?.url_list?.[0] ||
           video.download_addr?.url_list?.[0] ||
           video.bit_rate?.[0]?.play_addr?.url_list?.[0] ||
           '';
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 视频代理下载接口
app.post('/api/download-video', async (req, res) => {
    try {
        const { videoUrl, videoId } = req.body;
        console.log('🎬 开始代理下载视频:', videoUrl);

        if (!videoUrl) {
            return res.status(400).json({ error: '视频URL不能为空' });
        }

        // 验证视频URL格式
        if (!videoUrl.includes('http')) {
            return res.status(400).json({ error: '无效的视频URL格式' });
        }

        console.log('📡 尝试连接视频服务器...');

        const response = await axios.get(videoUrl, {
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
                'Referer': 'https://www.douyin.com/',
                'Accept': 'video/mp4,video/*,*/*',
                'Accept-Encoding': 'identity', // 禁用压缩避免流传输问题
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache'
            },
            timeout: 30000,
            maxRedirects: 5,
            validateStatus: function (status) {
                return status >= 200 && status < 400; // 只接受2xx和3xx状态码
            }
        });

        console.log('✅ 视频服务器连接成功，状态码:', response.status);

        // 设置下载响应头
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="douyin_video_${videoId || 'unknown'}.mp4"`);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        // 如果有Content-Length，转发给客户端
        if (response.headers['content-length']) {
            res.setHeader('Content-Length', response.headers['content-length']);
        }

        console.log('📤 开始流式传输视频...');

        // 流式传输视频
        response.data.pipe(res);

        // 监听流事件
        response.data.on('data', (chunk) => {
            // 可以在这里添加进度监控
        });

        response.data.on('end', () => {
            console.log('✅ 视频下载完成');
        });

        response.data.on('error', (error) => {
            console.error('❌ 视频流传输错误:', error);
            if (!res.headersSent) {
                res.status(500).json({ 
                    error: '视频流传输失败', 
                    details: error.message,
                    suggestion: '请检查网络连接或稍后重试'
                });
            }
        });

        // 监听客户端断开连接
        req.on('close', () => {
            console.log('📱 客户端断开连接，停止下载');
            response.data.destroy();
        });

    } catch (error) {
        console.error('❌ 视频下载失败:', error.message);
        
        let errorMessage = '视频下载失败';
        let suggestion = '请稍后重试';
        
        if (error.code === 'ECONNRESET') {
            errorMessage = '网络连接被重置';
            suggestion = '请检查网络连接';
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = '请求超时';
            suggestion = '请检查网络速度';
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = '无法找到视频服务器';
            suggestion = '视频链接可能已失效';
        } else if (error.response) {
            errorMessage = `服务器返回错误: ${error.response.status}`;
            suggestion = '视频可能已被删除或限制访问';
        }
        
        res.status(500).json({
            success: false,
            error: errorMessage,
            details: error.message,
            suggestion: suggestion,
            code: error.code
        });
    }
});

// 专门的视频文案提取接口 - 已注释（文案提取功能已禁用）
/*
app.post('/api/extract-content', async (req, res) => {
    try {
        const { url } = req.body;
        console.log('📝 开始提取视频文案:', url);

        if (!url) {
            return res.status(400).json({ error: 'URL不能为空' });
        }

        // 使用专门的文案提取工具
        const result = await contentExtractor.extractVideoContent(url);
        
        if (result.success) {
            console.log('✅ 文案提取成功');
            res.json({
                success: true,
                data: result.content,
                source: result.source,
                timestamp: result.timestamp
            });
        } else {
            console.log('❌ 文案提取失败:', result.error);
            res.json({
                success: false,
                error: result.error,
                data: result.content
            });
        }

    } catch (error) {
        console.error('❌ 文案提取服务错误:', error);
        res.status(500).json({
            success: false,
            error: '文案提取服务内部错误',
            details: error.message
        });
    }
});
*/

// Vercel兼容性：只在本地开发时启动服务器
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
        console.log('📱 现在可以正常获取抖音视频信息了！');
        // console.log('📝 文案提取服务已启动！'); // 已注释（文案提取功能已禁用）
    });
}

module.exports = app;