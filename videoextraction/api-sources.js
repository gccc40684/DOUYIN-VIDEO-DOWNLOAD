/**
 * API数据源管理模块
 * 管理多个API数据源和备用方案
 */

const axios = require('axios');
const { API_CONFIG, getApiUrl, getHeaders } = require('./api-config');

class ApiSources {
    constructor() {
        this.sources = new Map();
        this.initializeSources();
        this.requestCount = new Map();
        this.lastRequestTime = new Map();
    }

    /**
     * 初始化API数据源
     */
    initializeSources() {
        // 官方API源
        this.sources.set('official_v2', {
            name: '抖音官方API v2',
            priority: 1,
            enabled: true,
            rateLimit: 10,
            timeout: 15000,
            successRate: 0.85,
            lastUsed: 0,
            failureCount: 0,
            async fetch(videoId) {
                const url = getApiUrl('OFFICIAL_V2', videoId);
                const headers = getHeaders('MOBILE');
                
                const response = await axios.get(url, {
                    headers,
                    timeout: this.timeout,
                    validateStatus: (status) => status < 500
                });

                return this.parseOfficialV2Response(response.data);
            },
            parseOfficialV2Response(data) {
                if (!data.item_list || data.item_list.length === 0) {
                    throw new Error('没有找到视频数据');
                }
                return data.item_list[0];
            }
        });

        // 移动端API源
        this.sources.set('mobile', {
            name: '抖音移动端API',
            priority: 2,
            enabled: true,
            rateLimit: 15,
            timeout: 12000,
            successRate: 0.75,
            lastUsed: 0,
            failureCount: 0,
            async fetch(videoId) {
                const url = getApiUrl('MOBILE', videoId);
                const headers = getHeaders('MOBILE');
                
                const response = await axios.get(url, {
                    headers,
                    timeout: this.timeout,
                    validateStatus: (status) => status < 500
                });

                return this.parseMobileResponse(response.data);
            },
            parseMobileResponse(data) {
                if (!data.aweme_detail) {
                    throw new Error('没有找到视频详情');
                }
                return data.aweme_detail;
            }
        });

        // 网页端API源
        this.sources.set('web', {
            name: '抖音网页端API',
            priority: 3,
            enabled: true,
            rateLimit: 20,
            timeout: 10000,
            successRate: 0.65,
            lastUsed: 0,
            failureCount: 0,
            async fetch(videoId) {
                const url = getApiUrl('WEB', videoId, {
                    aid: '1128',
                    version_name: '23.5.0',
                    device_platform: 'webapp',
                    os_version: '10'
                });
                const headers = getHeaders('DESKTOP');
                
                const response = await axios.get(url, {
                    headers,
                    timeout: this.timeout,
                    validateStatus: (status) => status < 500
                });

                return this.parseWebResponse(response.data);
            },
            parseWebResponse(data) {
                if (!data.aweme_detail) {
                    throw new Error('没有找到视频详情');
                }
                return data.aweme_detail;
            }
        });

        // 备用API源
        this.sources.set('backup', {
            name: '备用API源',
            priority: 4,
            enabled: true,
            rateLimit: 5,
            timeout: 20000,
            successRate: 0.45,
            lastUsed: 0,
            failureCount: 0,
            async fetch(videoId) {
                const url = getApiUrl('BACKUP', videoId);
                const headers = getHeaders('STEALTH');
                
                const response = await axios.get(url, {
                    headers,
                    timeout: this.timeout,
                    validateStatus: (status) => status < 500
                });

                return this.parseBackupResponse(response.data);
            },
            parseBackupResponse(data) {
                if (data.item_list && data.item_list.length > 0) {
                    return data.item_list[0];
                } else if (data.aweme_detail) {
                    return data.aweme_detail;
                }
                throw new Error('没有找到视频数据');
            }
        });

        // 第三方API源（示例）
        this.sources.set('third_party', {
            name: '第三方API源',
            priority: 5,
            enabled: false, // 默认禁用
            rateLimit: 3,
            timeout: 25000,
            successRate: 0.30,
            lastUsed: 0,
            failureCount: 0,
            async fetch(videoId) {
                // 这里可以添加第三方API调用
                throw new Error('第三方API源暂未实现');
            }
        });
    }

    /**
     * 获取最佳可用的API源
     * @param {string} videoId 视频ID
     * @returns {Promise<Object>} 视频数据
     */
    async getBestSource(videoId) {
        const availableSources = this.getAvailableSources();
        
        console.log(`📊 ApiSources: 可用API源数量: ${availableSources.length}`);
        
        for (const source of availableSources) {
            try {
                console.log(`🔄 ApiSources: 尝试使用 ${source.name}...`);
                
                // 检查频率限制
                if (!this.checkRateLimit(source)) {
                    console.log(`⚠️ ApiSources: ${source.name} 达到频率限制，跳过`);
                    continue;
                }

                const startTime = Date.now();
                const data = await source.fetch(videoId);
                const responseTime = Date.now() - startTime;

                // 更新统计信息
                this.updateSourceStats(source, true, responseTime);
                
                console.log(`✅ ApiSources: ${source.name} 成功获取数据 (耗时: ${responseTime}ms)`);
                
                return {
                    success: true,
                    data,
                    source: source.name,
                    responseTime
                };

            } catch (error) {
                console.log(`❌ ApiSources: ${source.name} 失败: ${error.message}`);
                this.updateSourceStats(source, false);
            }
        }

        return {
            success: false,
            error: '所有API源都无法获取数据',
            attemptedSources: availableSources.map(s => s.name)
        };
    }

    /**
     * 获取可用的API源列表（按优先级排序）
     * @returns {Array} 可用的API源列表
     */
    getAvailableSources() {
        return Array.from(this.sources.values())
            .filter(source => source.enabled)
            .sort((a, b) => {
                // 综合考虑优先级、成功率和失败次数
                const scoreA = a.priority + (1 - a.successRate) * 10 + a.failureCount * 2;
                const scoreB = b.priority + (1 - b.successRate) * 10 + b.failureCount * 2;
                return scoreA - scoreB;
            });
    }

    /**
     * 检查API源的频率限制
     * @param {Object} source API源
     * @returns {boolean} 是否可以使用
     */
    checkRateLimit(source) {
        const now = Date.now();
        const sourceId = this.getSourceId(source);
        
        const lastRequest = this.lastRequestTime.get(sourceId) || 0;
        const requestCount = this.requestCount.get(sourceId) || 0;
        
        // 重置计数器（每分钟重置）
        if (now - lastRequest > 60000) {
            this.requestCount.set(sourceId, 0);
            this.lastRequestTime.set(sourceId, now);
            return true;
        }
        
        // 检查是否超过限制
        if (requestCount >= source.rateLimit) {
            return false;
        }
        
        // 更新计数器
        this.requestCount.set(sourceId, requestCount + 1);
        this.lastRequestTime.set(sourceId, now);
        
        return true;
    }

    /**
     * 更新API源统计信息
     * @param {Object} source API源
     * @param {boolean} success 是否成功
     * @param {number} responseTime 响应时间
     */
    updateSourceStats(source, success, responseTime = 0) {
        source.lastUsed = Date.now();
        
        if (success) {
            source.failureCount = Math.max(0, source.failureCount - 1);
            // 更新成功率（使用指数移动平均）
            source.successRate = source.successRate * 0.9 + 0.1;
            
            if (responseTime > 0) {
                source.averageResponseTime = source.averageResponseTime 
                    ? (source.averageResponseTime * 0.8 + responseTime * 0.2)
                    : responseTime;
            }
        } else {
            source.failureCount += 1;
            // 降低成功率
            source.successRate = source.successRate * 0.9;
            
            // 如果连续失败过多，临时禁用
            if (source.failureCount >= 5) {
                source.enabled = false;
                console.log(`⚠️ ApiSources: ${source.name} 连续失败过多，临时禁用`);
                
                // 5分钟后重新启用
                setTimeout(() => {
                    source.enabled = true;
                    source.failureCount = 0;
                    console.log(`✅ ApiSources: ${source.name} 重新启用`);
                }, 5 * 60 * 1000);
            }
        }
    }

    /**
     * 获取API源的唯一标识
     * @param {Object} source API源
     * @returns {string} 源标识
     */
    getSourceId(source) {
        return source.name.toLowerCase().replace(/\s+/g, '_');
    }

    /**
     * 获取所有API源的状态
     * @returns {Object} API源状态信息
     */
    getSourcesStatus() {
        const status = {};
        
        this.sources.forEach((source, key) => {
            status[key] = {
                name: source.name,
                enabled: source.enabled,
                priority: source.priority,
                successRate: Math.round(source.successRate * 100) + '%',
                failureCount: source.failureCount,
                rateLimit: source.rateLimit,
                lastUsed: source.lastUsed ? new Date(source.lastUsed).toLocaleString() : '未使用',
                averageResponseTime: source.averageResponseTime ? Math.round(source.averageResponseTime) + 'ms' : '未知'
            };
        });
        
        return status;
    }

    /**
     * 重置所有API源的统计信息
     */
    resetStats() {
        this.sources.forEach(source => {
            source.successRate = 0.5; // 重置为中等成功率
            source.failureCount = 0;
            source.lastUsed = 0;
            source.enabled = true;
            source.averageResponseTime = 0;
        });
        
        this.requestCount.clear();
        this.lastRequestTime.clear();
        
        console.log('📊 ApiSources: 所有统计信息已重置');
    }

    /**
     * 启用或禁用API源
     * @param {string} sourceKey 源标识
     * @param {boolean} enabled 是否启用
     */
    toggleSource(sourceKey, enabled) {
        const source = this.sources.get(sourceKey);
        if (source) {
            source.enabled = enabled;
            console.log(`${enabled ? '✅' : '❌'} ApiSources: ${source.name} ${enabled ? '已启用' : '已禁用'}`);
        }
    }

    /**
     * 添加自定义API源
     * @param {string} key 源标识
     * @param {Object} config 源配置
     */
    addCustomSource(key, config) {
        const defaultConfig = {
            name: 'Custom Source',
            priority: 10,
            enabled: true,
            rateLimit: 5,
            timeout: 15000,
            successRate: 0.5,
            lastUsed: 0,
            failureCount: 0
        };

        this.sources.set(key, { ...defaultConfig, ...config });
        console.log(`✅ ApiSources: 添加自定义源 ${config.name || key}`);
    }
}

module.exports = ApiSources;
