/**
 * 后端代理模块
 * 处理请求代理、缓存和负载均衡
 */

const axios = require('axios');
const { API_CONFIG } = require('./api-config');

class BackendProxy {
    constructor() {
        this.cache = new Map();
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.proxyStats = {
            totalRequests: 0,
            successfulRequests: 0,
            cachedRequests: 0,
            averageResponseTime: 0
        };
        
        // 启动缓存清理定时器
        this.startCacheCleanup();
    }

    /**
     * 代理请求
     * @param {string} url 目标URL
     * @param {Object} options 请求选项
     * @returns {Promise<Object>} 响应结果
     */
    async proxyRequest(url, options = {}) {
        const startTime = Date.now();
        this.proxyStats.totalRequests++;

        try {
            console.log('🔄 BackendProxy: 开始代理请求:', url);

            // 检查缓存
            const cacheKey = this.generateCacheKey(url, options);
            const cachedResult = this.getFromCache(cacheKey);
            
            if (cachedResult) {
                console.log('📦 BackendProxy: 返回缓存结果');
                this.proxyStats.cachedRequests++;
                return cachedResult;
            }

            // 添加到请求队列
            const result = await this.addToQueue(url, options);
            
            // 缓存结果
            if (result.success) {
                this.addToCache(cacheKey, result);
                this.proxyStats.successfulRequests++;
            }

            // 更新统计信息
            const responseTime = Date.now() - startTime;
            this.updateResponseTimeStats(responseTime);

            console.log(`✅ BackendProxy: 请求完成 (耗时: ${responseTime}ms)`);
            return result;

        } catch (error) {
            console.error('❌ BackendProxy: 代理请求失败:', error.message);
            return {
                success: false,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }

    /**
     * 添加请求到队列
     * @param {string} url 目标URL
     * @param {Object} options 请求选项
     * @returns {Promise<Object>} 响应结果
     */
    async addToQueue(url, options) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                url,
                options,
                resolve,
                reject,
                timestamp: Date.now()
            });

            this.processQueue();
        });
    }

    /**
     * 处理请求队列
     */
    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        try {
            while (this.requestQueue.length > 0) {
                const request = this.requestQueue.shift();
                
                try {
                    const result = await this.executeRequest(request.url, request.options);
                    request.resolve(result);
                } catch (error) {
                    request.reject(error);
                }

                // 添加延迟以避免过于频繁的请求
                await this.delay(100);
            }
        } finally {
            this.isProcessingQueue = false;
        }
    }

    /**
     * 执行实际的HTTP请求
     * @param {string} url 目标URL
     * @param {Object} options 请求选项
     * @returns {Promise<Object>} 响应结果
     */
    async executeRequest(url, options = {}) {
        const config = {
            method: options.method || 'GET',
            url,
            headers: options.headers || {},
            timeout: options.timeout || API_CONFIG.TIMEOUT.response,
            validateStatus: (status) => status < 500,
            ...options
        };

        // 添加默认请求头
        config.headers = {
            ...API_CONFIG.HEADERS.BASE,
            ...config.headers
        };

        console.log('📡 BackendProxy: 发送HTTP请求:', {
            method: config.method,
            url: config.url,
            timeout: config.timeout
        });

        const response = await axios(config);

        return {
            success: response.status >= 200 && response.status < 300,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data,
            timestamp: Date.now()
        };
    }

    /**
     * 生成缓存键
     * @param {string} url 请求URL
     * @param {Object} options 请求选项
     * @returns {string} 缓存键
     */
    generateCacheKey(url, options) {
        const key = `${options.method || 'GET'}:${url}`;
        
        // 如果有特殊的请求头或参数，也加入缓存键
        if (options.headers && Object.keys(options.headers).length > 0) {
            const headerKey = JSON.stringify(options.headers);
            return `${key}:${this.hashString(headerKey)}`;
        }
        
        return key;
    }

    /**
     * 简单的字符串哈希函数
     * @param {string} str 输入字符串
     * @returns {string} 哈希值
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * 从缓存获取结果
     * @param {string} key 缓存键
     * @returns {Object|null} 缓存结果
     */
    getFromCache(key) {
        if (!API_CONFIG.CACHE.enabled) {
            return null;
        }

        const cached = this.cache.get(key);
        if (!cached) {
            return null;
        }

        // 检查缓存是否过期
        const now = Date.now();
        if (now - cached.timestamp > API_CONFIG.CACHE.ttl) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    /**
     * 添加结果到缓存
     * @param {string} key 缓存键
     * @param {Object} data 数据
     */
    addToCache(key, data) {
        if (!API_CONFIG.CACHE.enabled) {
            return;
        }

        // 检查缓存大小限制
        if (this.cache.size >= API_CONFIG.CACHE.maxSize) {
            // 删除最旧的缓存项
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });

        console.log(`📦 BackendProxy: 添加到缓存 (缓存大小: ${this.cache.size})`);
    }

    /**
     * 启动缓存清理定时器
     */
    startCacheCleanup() {
        setInterval(() => {
            this.cleanupCache();
        }, API_CONFIG.CACHE.cleanupInterval);
    }

    /**
     * 清理过期缓存
     */
    cleanupCache() {
        if (!API_CONFIG.CACHE.enabled) {
            return;
        }

        const now = Date.now();
        let cleanedCount = 0;

        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > API_CONFIG.CACHE.ttl) {
                this.cache.delete(key);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 BackendProxy: 清理了 ${cleanedCount} 个过期缓存项`);
        }
    }

    /**
     * 更新响应时间统计
     * @param {number} responseTime 响应时间
     */
    updateResponseTimeStats(responseTime) {
        const currentAvg = this.proxyStats.averageResponseTime;
        const totalRequests = this.proxyStats.totalRequests;
        
        // 使用移动平均计算
        this.proxyStats.averageResponseTime = 
            (currentAvg * (totalRequests - 1) + responseTime) / totalRequests;
    }

    /**
     * 延迟函数
     * @param {number} ms 延迟毫秒数
     * @returns {Promise} Promise对象
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 获取代理统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.proxyStats,
            cacheSize: this.cache.size,
            queueLength: this.requestQueue.length,
            cacheHitRate: this.proxyStats.totalRequests > 0 
                ? Math.round((this.proxyStats.cachedRequests / this.proxyStats.totalRequests) * 100) + '%'
                : '0%',
            successRate: this.proxyStats.totalRequests > 0
                ? Math.round((this.proxyStats.successfulRequests / this.proxyStats.totalRequests) * 100) + '%'
                : '0%',
            averageResponseTime: Math.round(this.proxyStats.averageResponseTime) + 'ms'
        };
    }

    /**
     * 重置统计信息
     */
    resetStats() {
        this.proxyStats = {
            totalRequests: 0,
            successfulRequests: 0,
            cachedRequests: 0,
            averageResponseTime: 0
        };
        console.log('📊 BackendProxy: 统计信息已重置');
    }

    /**
     * 清空缓存
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 BackendProxy: 缓存已清空');
    }

    /**
     * 设置缓存配置
     * @param {Object} config 缓存配置
     */
    setCacheConfig(config) {
        Object.assign(API_CONFIG.CACHE, config);
        console.log('⚙️ BackendProxy: 缓存配置已更新:', config);
    }

    /**
     * 健康检查
     * @returns {Object} 健康状态
     */
    healthCheck() {
        const stats = this.getStats();
        const isHealthy = stats.queueLength < 100 && stats.cacheSize < API_CONFIG.CACHE.maxSize;
        
        return {
            status: isHealthy ? 'healthy' : 'warning',
            timestamp: new Date().toISOString(),
            stats,
            issues: !isHealthy ? [
                stats.queueLength >= 100 ? '请求队列过长' : null,
                stats.cacheSize >= API_CONFIG.CACHE.maxSize ? '缓存接近上限' : null
            ].filter(Boolean) : []
        };
    }
}

module.exports = BackendProxy;
