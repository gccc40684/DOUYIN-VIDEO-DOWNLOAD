/**
 * API配置文件
 * 包含各种API端点和配置信息
 */

const API_CONFIG = {
    // 抖音官方API端点
    DOUYIN_ENDPOINTS: {
        // 官方API v2
        OFFICIAL_V2: {
            base: 'https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/',
            timeout: 15000,
            rateLimit: 10, // 每分钟最多10次请求
            description: '抖音官方API v2，稳定性较高'
        },
        
        // 移动端API
        MOBILE: {
            base: 'https://www.douyin.com/aweme/v1/web/aweme/detail/',
            timeout: 12000,
            rateLimit: 15,
            description: '移动端API，响应速度快'
        },
        
        // 网页端API
        WEB: {
            base: 'https://www.douyin.com/aweme/v1/web/aweme/detail/',
            timeout: 10000,
            rateLimit: 20,
            description: '网页端API，兼容性好'
        },
        
        // 备用API
        BACKUP: {
            base: 'https://www.douyin.com/web/api/v2/aweme/iteminfo/',
            timeout: 20000,
            rateLimit: 5,
            description: '备用API端点'
        }
    },

    // 请求头配置
    HEADERS: {
        // 基础请求头
        BASE: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        },

        // 移动端请求头
        MOBILE: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
            'Referer': 'https://www.douyin.com/',
            'Origin': 'https://www.douyin.com',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site'
        },

        // 桌面端请求头
        DESKTOP: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.douyin.com/',
            'Origin': 'https://www.douyin.com',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"'
        },

        // 爬虫检测规避
        STEALTH: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        }
    },

    // 重试配置
    RETRY: {
        maxAttempts: 5,
        baseDelay: 1000, // 基础延迟1秒
        maxDelay: 10000, // 最大延迟10秒
        backoffFactor: 2, // 指数退避因子
        jitter: true // 添加随机抖动
    },

    // 超时配置
    TIMEOUT: {
        connect: 5000,
        response: 15000,
        total: 30000
    },

    // 视频ID提取正则表达式
    VIDEO_ID_PATTERNS: [
        /\/video\/(\d+)/,
        /\/share\/video\/(\d+)/,
        /aweme_id=(\d+)/,
        /modal_id=(\d+)/,
        /\/(\d{19})/,  // 19位数字ID
        /\/(\d{18})/,  // 18位数字ID
        /\/(\d{17})/,  // 17位数字ID
        /\/(\d{16})/,  // 16位数字ID
        /\/(\d{15})/,  // 15位数字ID
        /item_ids=(\d+)/,
        /\/note\/(\d+)/,
        /\/(\d{10,})/  // 10位以上数字ID
    ],

    // 短链接域名
    SHORT_DOMAINS: [
        'v.douyin.com',
        'iesdouyin.com',
        'dy.tt',
        'douyin.com/video'
    ],

    // API限流配置
    RATE_LIMIT: {
        windowMs: 60 * 1000, // 1分钟窗口
        maxRequests: 30, // 每分钟最多30次请求
        skipFailedRequests: true,
        skipSuccessfulRequests: false
    },

    // 错误码映射
    ERROR_CODES: {
        0: 'success',
        10000: '参数错误',
        10001: '视频不存在',
        10002: '视频已被删除',
        10003: '视频需要登录查看',
        10004: '视频地区限制',
        10005: '视频作者设置了隐私',
        10006: 'API调用频率过高',
        10007: '服务器内部错误',
        10008: '网络连接超时',
        10009: '解析失败'
    },

    // 视频质量配置
    VIDEO_QUALITY: {
        PRIORITIES: ['1080p', '720p', '480p', '360p', 'auto'],
        FORMATS: ['mp4', 'webm', 'm3u8'],
        PREFERRED_FORMAT: 'mp4'
    },

    // 缓存配置
    CACHE: {
        enabled: true,
        ttl: 300000, // 5分钟缓存
        maxSize: 100, // 最多缓存100个结果
        cleanupInterval: 600000 // 10分钟清理一次
    },

    // 代理配置（如果需要）
    PROXY: {
        enabled: false,
        http: null,
        https: null,
        timeout: 10000
    },

    // 调试配置
    DEBUG: {
        enabled: process.env.NODE_ENV === 'development',
        logLevel: 'info', // error, warn, info, debug
        logRequests: true,
        logResponses: false,
        logErrors: true
    }
};

// 获取API端点URL
function getApiUrl(endpoint, videoId, params = {}) {
    const config = API_CONFIG.DOUYIN_ENDPOINTS[endpoint];
    if (!config) {
        throw new Error(`未知的API端点: ${endpoint}`);
    }

    let url = config.base;
    
    // 根据不同端点构建URL
    switch (endpoint) {
        case 'OFFICIAL_V2':
            url += `?item_ids=${videoId}`;
            break;
        case 'MOBILE':
        case 'WEB':
            url += `?aweme_id=${videoId}`;
            break;
        case 'BACKUP':
            url += `?item_ids=${videoId}`;
            break;
        default:
            url += `?aweme_id=${videoId}`;
    }

    // 添加额外参数
    const urlParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
        urlParams.append(key, params[key]);
    });
    
    if (urlParams.toString()) {
        url += (url.includes('?') ? '&' : '?') + urlParams.toString();
    }

    return url;
}

// 获取请求头
function getHeaders(type = 'BASE') {
    const baseHeaders = API_CONFIG.HEADERS.BASE;
    const specificHeaders = API_CONFIG.HEADERS[type] || {};
    
    return {
        ...baseHeaders,
        ...specificHeaders
    };
}

// 计算重试延迟
function calculateRetryDelay(attempt) {
    const config = API_CONFIG.RETRY;
    let delay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
    delay = Math.min(delay, config.maxDelay);
    
    if (config.jitter) {
        // 添加±25%的随机抖动
        const jitter = delay * 0.25 * (Math.random() * 2 - 1);
        delay += jitter;
    }
    
    return Math.max(delay, 0);
}

// 验证视频ID格式
function validateVideoId(videoId) {
    if (!videoId || typeof videoId !== 'string') {
        return false;
    }
    
    // 检查是否为纯数字且长度合理
    const numericId = videoId.replace(/\D/g, '');
    return numericId.length >= 10 && numericId.length <= 25;
}

// 检查是否为短链接
function isShortUrl(url) {
    return API_CONFIG.SHORT_DOMAINS.some(domain => url.includes(domain));
}

module.exports = {
    API_CONFIG,
    getApiUrl,
    getHeaders,
    calculateRetryDelay,
    validateVideoId,
    isShortUrl
};
