/**
 * 视频URL提取器
 * 专门用于从各种抖音链接中提取和处理视频URL
 */

const axios = require('axios');
const { API_CONFIG, isShortUrl } = require('./api-config');
const douyinDebugger = require('./douyin-debugger');

class VideoUrlExtractor {
    constructor() {
        this.extractionMethods = [
            this.extractFromOfficialApi.bind(this),
            this.extractFromMobileApi.bind(this),
            this.extractFromWebScraping.bind(this),
            this.extractFromFallbackMethods.bind(this)
        ];
        
        this.stats = {
            totalExtractions: 0,
            successfulExtractions: 0,
            methodSuccessRates: {}
        };
        
        douyinDebugger.info('VideoUrlExtractor 初始化完成');
    }

    /**
     * 提取视频URL
     * @param {string} inputUrl 输入的抖音链接
     * @returns {Promise<Object>} 提取结果
     */
    async extractVideoUrl(inputUrl) {
        const testId = douyinDebugger.startPerformanceTest('VideoUrlExtraction');
        this.stats.totalExtractions++;
        
        try {
            douyinDebugger.info('开始提取视频URL', { inputUrl });

            // 1. URL预处理和验证
            const processedUrl = await this.preprocessUrl(inputUrl);
            if (!processedUrl.success) {
                throw new Error(processedUrl.error);
            }

            // 2. 提取视频ID
            const videoId = this.extractVideoId(processedUrl.url);
            if (!videoId) {
                throw new Error('无法从URL中提取视频ID');
            }

            douyinDebugger.debugVideoIdExtraction(
                inputUrl, 
                processedUrl.url, 
                videoId, 
                API_CONFIG.VIDEO_ID_PATTERNS
            );

            // 3. 尝试多种提取方法
            const result = await this.tryExtractionMethods(videoId, processedUrl.url);
            
            if (result.success) {
                this.stats.successfulExtractions++;
                douyinDebugger.info('视频URL提取成功', { 
                    videoId, 
                    method: result.method,
                    videoUrl: result.videoUrl ? '已获取' : '未获取'
                });
            }

            douyinDebugger.endPerformanceTest(testId, { 
                success: result.success,
                method: result.method 
            });

            return result;

        } catch (error) {
            douyinDebugger.error('视频URL提取失败', { 
                inputUrl, 
                error: error.message 
            });
            
            douyinDebugger.endPerformanceTest(testId, { 
                success: false, 
                error: error.message 
            });

            return {
                success: false,
                error: error.message,
                inputUrl,
                timestamp: Date.now()
            };
        }
    }

    /**
     * URL预处理
     * @param {string} url 原始URL
     * @returns {Promise<Object>} 处理结果
     */
    async preprocessUrl(url) {
        try {
            // 基础验证
            if (!url || typeof url !== 'string') {
                return { success: false, error: 'URL不能为空' };
            }

            // 清理URL
            let cleanUrl = url.trim();
            
            // 处理常见的URL格式问题
            if (!cleanUrl.startsWith('http')) {
                cleanUrl = 'https://' + cleanUrl;
            }

            // 展开短链接
            if (isShortUrl(cleanUrl)) {
                douyinDebugger.debug('检测到短链接，开始展开', { originalUrl: cleanUrl });
                
                const expandedUrl = await this.expandShortUrl(cleanUrl);
                if (expandedUrl) {
                    cleanUrl = expandedUrl;
                    douyinDebugger.debug('短链接展开成功', { expandedUrl: cleanUrl });
                }
            }

            // 验证是否为抖音链接
            if (!this.isValidDouyinUrl(cleanUrl)) {
                return { success: false, error: '不是有效的抖音链接' };
            }

            return { success: true, url: cleanUrl };

        } catch (error) {
            douyinDebugger.error('URL预处理失败', { url, error: error.message });
            return { success: false, error: `URL预处理失败: ${error.message}` };
        }
    }

    /**
     * 展开短链接
     * @param {string} shortUrl 短链接
     * @returns {Promise<string|null>} 展开后的URL
     */
    async expandShortUrl(shortUrl) {
        try {
            const response = await axios.get(shortUrl, {
                maxRedirects: 10,
                timeout: 10000,
                headers: API_CONFIG.HEADERS.MOBILE,
                validateStatus: () => true
            });

            const expandedUrl = response.request?.res?.responseUrl || 
                              response.request?.responseURL || 
                              response.config?.url;

            return expandedUrl || null;

        } catch (error) {
            douyinDebugger.warn('短链接展开失败', { shortUrl, error: error.message });
            return null;
        }
    }

    /**
     * 验证是否为有效的抖音URL
     * @param {string} url URL
     * @returns {boolean} 是否有效
     */
    isValidDouyinUrl(url) {
        const douyinDomains = [
            'douyin.com',
            'iesdouyin.com',
            'v.douyin.com',
            'www.douyin.com',
            'www.iesdouyin.com'
        ];

        return douyinDomains.some(domain => url.includes(domain));
    }

    /**
     * 提取视频ID
     * @param {string} url URL
     * @returns {string|null} 视频ID
     */
    extractVideoId(url) {
        for (const pattern of API_CONFIG.VIDEO_ID_PATTERNS) {
            const match = url.match(pattern);
            if (match && match[1]) {
                const videoId = match[1];
                
                // 验证视频ID格式
                if (this.validateVideoId(videoId)) {
                    return videoId;
                }
            }
        }

        return null;
    }

    /**
     * 验证视频ID格式
     * @param {string} videoId 视频ID
     * @returns {boolean} 是否有效
     */
    validateVideoId(videoId) {
        // 视频ID应该是10-25位的数字
        return /^\d{10,25}$/.test(videoId);
    }

    /**
     * 尝试多种提取方法
     * @param {string} videoId 视频ID
     * @param {string} fullUrl 完整URL
     * @returns {Promise<Object>} 提取结果
     */
    async tryExtractionMethods(videoId, fullUrl) {
        for (const [index, method] of this.extractionMethods.entries()) {
            const methodName = method.name.replace('bound ', '');
            
            try {
                douyinDebugger.debug(`尝试提取方法: ${methodName}`);
                
                const result = await method(videoId, fullUrl);
                
                if (result && result.success && result.videoUrl) {
                    // 更新成功率统计
                    this.updateMethodStats(methodName, true);
                    
                    return {
                        success: true,
                        method: methodName,
                        videoUrl: result.videoUrl,
                        videoData: result.videoData || null,
                        timestamp: Date.now()
                    };
                }

            } catch (error) {
                douyinDebugger.warn(`提取方法 ${methodName} 失败`, { error: error.message });
                this.updateMethodStats(methodName, false);
            }
        }

        return {
            success: false,
            error: '所有提取方法都失败了',
            attemptedMethods: this.extractionMethods.length,
            timestamp: Date.now()
        };
    }

    /**
     * 从官方API提取
     * @param {string} videoId 视频ID
     * @param {string} fullUrl 完整URL
     * @returns {Promise<Object>} 提取结果
     */
    async extractFromOfficialApi(videoId, fullUrl) {
        const apiUrl = `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`;
        
        const response = await axios.get(apiUrl, {
            headers: API_CONFIG.HEADERS.MOBILE,
            timeout: 15000,
            validateStatus: (status) => status < 500
        });

        douyinDebugger.debugApiRequest(apiUrl, { headers: API_CONFIG.HEADERS.MOBILE }, response);

        if (response.status !== 200 || !response.data) {
            throw new Error(`API响应异常: ${response.status}`);
        }

        const data = response.data;
        if (!data.item_list || data.item_list.length === 0) {
            throw new Error('API返回的数据中没有视频信息');
        }

        const videoData = data.item_list[0];
        const videoUrl = this.extractVideoUrlFromData(videoData);

        if (!videoUrl) {
            throw new Error('无法从API数据中提取视频URL');
        }

        return {
            success: true,
            videoUrl,
            videoData: this.formatVideoData(videoData)
        };
    }

    /**
     * 从移动端API提取
     * @param {string} videoId 视频ID
     * @param {string} fullUrl 完整URL
     * @returns {Promise<Object>} 提取结果
     */
    async extractFromMobileApi(videoId, fullUrl) {
        const apiUrl = `https://www.douyin.com/aweme/v1/web/aweme/detail/?aweme_id=${videoId}`;
        
        const response = await axios.get(apiUrl, {
            headers: API_CONFIG.HEADERS.MOBILE,
            timeout: 12000,
            validateStatus: (status) => status < 500
        });

        douyinDebugger.debugApiRequest(apiUrl, { headers: API_CONFIG.HEADERS.MOBILE }, response);

        if (response.status !== 200 || !response.data) {
            throw new Error(`移动端API响应异常: ${response.status}`);
        }

        const data = response.data;
        if (!data.aweme_detail) {
            throw new Error('移动端API返回的数据中没有视频详情');
        }

        const videoData = data.aweme_detail;
        const videoUrl = this.extractVideoUrlFromData(videoData);

        if (!videoUrl) {
            throw new Error('无法从移动端API数据中提取视频URL');
        }

        return {
            success: true,
            videoUrl,
            videoData: this.formatVideoData(videoData)
        };
    }

    /**
     * 从网页抓取提取
     * @param {string} videoId 视频ID
     * @param {string} fullUrl 完整URL
     * @returns {Promise<Object>} 提取结果
     */
    async extractFromWebScraping(videoId, fullUrl) {
        const response = await axios.get(fullUrl, {
            headers: API_CONFIG.HEADERS.STEALTH,
            timeout: 20000,
            validateStatus: (status) => status < 500
        });

        if (response.status !== 200) {
            throw new Error(`网页请求失败: ${response.status}`);
        }

        const html = response.data;
        
        // 尝试从HTML中提取视频URL
        const videoUrl = this.extractVideoUrlFromHtml(html);
        
        if (!videoUrl) {
            throw new Error('无法从网页HTML中提取视频URL');
        }

        // 尝试提取基础信息
        const videoData = this.extractBasicInfoFromHtml(html);

        return {
            success: true,
            videoUrl,
            videoData
        };
    }

    /**
     * 备用提取方法
     * @param {string} videoId 视频ID
     * @param {string} fullUrl 完整URL
     * @returns {Promise<Object>} 提取结果
     */
    async extractFromFallbackMethods(videoId, fullUrl) {
        // 这里可以实现更多的备用方法
        // 比如使用第三方API、缓存查找等
        
        douyinDebugger.debug('使用备用提取方法');
        
        // 示例：尝试构造可能的视频URL格式
        const possibleUrls = this.generatePossibleVideoUrls(videoId);
        
        for (const url of possibleUrls) {
            try {
                const isValid = await this.validateVideoUrl(url);
                if (isValid) {
                    return {
                        success: true,
                        videoUrl: url,
                        videoData: {
                            videoId,
                            method: 'fallback',
                            confidence: 'low'
                        }
                    };
                }
            } catch (error) {
                // 继续尝试下一个URL
            }
        }

        throw new Error('所有备用方法都失败了');
    }

    /**
     * 从数据中提取视频URL
     * @param {Object} data 视频数据
     * @returns {string|null} 视频URL
     */
    extractVideoUrlFromData(data) {
        const video = data.video;
        if (!video) return null;

        // 尝试不同的视频地址字段
        const urlSources = [
            video.play_addr?.url_list,
            video.download_addr?.url_list,
            video.bit_rate?.[0]?.play_addr?.url_list,
            video.play_addr_h264?.url_list,
            video.play_addr_265?.url_list
        ];

        for (const urlList of urlSources) {
            if (urlList && urlList.length > 0) {
                // 优先选择非m3u8格式
                const mp4Url = urlList.find(url => !url.includes('.m3u8'));
                if (mp4Url) return mp4Url;
                
                // 如果没有mp4，返回第一个
                return urlList[0];
            }
        }

        return null;
    }

    /**
     * 从HTML中提取视频URL
     * @param {string} html HTML内容
     * @returns {string|null} 视频URL
     */
    extractVideoUrlFromHtml(html) {
        // 尝试多种正则表达式模式
        const patterns = [
            /"play_addr":\{"uri":"([^"]+)"/,
            /"download_addr":\{"uri":"([^"]+)"/,
            /playAddr":"([^"]+)"/,
            /videoUrl":"([^"]+)"/,
            /"src":"([^"]+\.mp4[^"]*)"/
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                let url = match[1];
                
                // 处理URL编码
                url = decodeURIComponent(url);
                
                // 如果是相对URL，转换为绝对URL
                if (url.startsWith('//')) {
                    url = 'https:' + url;
                } else if (url.startsWith('/')) {
                    url = 'https://www.douyin.com' + url;
                }

                return url;
            }
        }

        return null;
    }

    /**
     * 从HTML中提取基础信息
     * @param {string} html HTML内容
     * @returns {Object} 基础信息
     */
    extractBasicInfoFromHtml(html) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const descMatch = html.match(/data-desc="([^"]+)"/i) || 
                         html.match(/description[^>]*content="([^"]+)"/i);
        const authorMatch = html.match(/data-author="([^"]+)"/i) || 
                           html.match(/"nickname":"([^"]+)"/i);

        return {
            title: titleMatch ? titleMatch[1] : null,
            description: descMatch ? descMatch[1] : null,
            author: authorMatch ? authorMatch[1] : null,
            extractedFrom: 'html'
        };
    }

    /**
     * 生成可能的视频URL
     * @param {string} videoId 视频ID
     * @returns {Array<string>} 可能的URL列表
     */
    generatePossibleVideoUrls(videoId) {
        const baseUrls = [
            'https://aweme.snssdk.com/aweme/v1/playwm/',
            'https://www.iesdouyin.com/aweme/v1/playwm/',
            'https://api.douyin.com/aweme/v1/playwm/'
        ];

        return baseUrls.map(base => `${base}?video_id=${videoId}&line=0`);
    }

    /**
     * 验证视频URL是否可访问
     * @param {string} videoUrl 视频URL
     * @returns {Promise<boolean>} 是否可访问
     */
    async validateVideoUrl(videoUrl) {
        try {
            const response = await axios.head(videoUrl, {
                headers: API_CONFIG.HEADERS.BASE,
                timeout: 5000,
                validateStatus: (status) => status < 400
            });

            return response.status === 200 && 
                   response.headers['content-type']?.includes('video');

        } catch (error) {
            return false;
        }
    }

    /**
     * 格式化视频数据
     * @param {Object} rawData 原始数据
     * @returns {Object} 格式化后的数据
     */
    formatVideoData(rawData) {
        return {
            videoId: rawData.aweme_id,
            author: rawData.author?.nickname || '未知作者',
            description: rawData.desc || '无描述',
            createTime: rawData.create_time ? 
                new Date(rawData.create_time * 1000).toISOString() : null,
            statistics: {
                likeCount: rawData.statistics?.digg_count || 0,
                commentCount: rawData.statistics?.comment_count || 0,
                shareCount: rawData.statistics?.share_count || 0
            },
            video: {
                duration: rawData.video?.duration || 0,
                width: rawData.video?.width || 0,
                height: rawData.video?.height || 0,
                coverUrl: rawData.video?.cover?.url_list?.[0] || null
            }
        };
    }

    /**
     * 更新方法成功率统计
     * @param {string} methodName 方法名
     * @param {boolean} success 是否成功
     */
    updateMethodStats(methodName, success) {
        if (!this.stats.methodSuccessRates[methodName]) {
            this.stats.methodSuccessRates[methodName] = { success: 0, total: 0 };
        }

        const methodStats = this.stats.methodSuccessRates[methodName];
        methodStats.total++;
        if (success) {
            methodStats.success++;
        }
    }

    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        const stats = { ...this.stats };
        
        // 计算成功率
        stats.overallSuccessRate = this.stats.totalExtractions > 0 ? 
            Math.round((this.stats.successfulExtractions / this.stats.totalExtractions) * 100) + '%' : 
            '0%';

        // 计算各方法的成功率
        Object.keys(stats.methodSuccessRates).forEach(method => {
            const methodStats = stats.methodSuccessRates[method];
            methodStats.successRate = methodStats.total > 0 ?
                Math.round((methodStats.success / methodStats.total) * 100) + '%' :
                '0%';
        });

        return stats;
    }

    /**
     * 重置统计信息
     */
    resetStats() {
        this.stats = {
            totalExtractions: 0,
            successfulExtractions: 0,
            methodSuccessRates: {}
        };
        
        douyinDebugger.info('VideoUrlExtractor 统计信息已重置');
    }
}

module.exports = VideoUrlExtractor;
