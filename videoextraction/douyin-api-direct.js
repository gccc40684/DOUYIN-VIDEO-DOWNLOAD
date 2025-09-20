/**
 * 抖音API直接调用模块
 * 用于直接调用抖音API获取视频信息
 */

const axios = require('axios');

class DouyinAPIDirect {
    constructor() {
        this.baseHeaders = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://www.douyin.com/',
            'Origin': 'https://www.douyin.com',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'X-Requested-With': 'XMLHttpRequest',
            'Cookie': 'ttwid=1%7C; msToken=; __ac_nonce=; __ac_signature=;'
        };
        
        this.timeout = 15000;
    }

    /**
     * 获取视频信息
     * @param {string} url 抖音视频链接
     * @returns {Promise<Object>} 视频信息
     */
    async getVideoInfo(url) {
        try {
            console.log('🔍 DouyinAPIDirect: 开始解析视频链接:', url);

            // 先展开短链接
            const fullUrl = await this.expandShortUrl(url);
            console.log('📤 DouyinAPIDirect: 展开后的链接:', fullUrl);

            // 提取视频ID
            const videoId = this.extractVideoId(fullUrl);
            console.log('🎯 DouyinAPIDirect: 提取到视频ID:', videoId);

            if (!videoId) {
                throw new Error('无法从链接中提取视频ID');
            }

            // 使用HTML解析方法获取视频信息
            const result = await this.parseVideoFromHtml(fullUrl, videoId);
            
            if (result && result.success) {
                console.log('✅ DouyinAPIDirect: 成功获取视频信息');
                return result;
            } else {
                console.log('❌ DouyinAPIDirect: HTML解析失败');
                return {
                    success: false,
                    error: '无法获取视频信息',
                    data: null
                };
            }

        } catch (error) {
            console.error('❌ DouyinAPIDirect: 获取视频信息失败:', error.message);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * 从HTML解析视频信息
     * @param {string} url 视频页面URL
     * @param {string} videoId 视频ID
     * @returns {Promise<Object>} 视频信息
     */
    async parseVideoFromHtml(url, videoId) {
        try {
            console.log('🌐 DouyinAPIDirect: 开始解析HTML页面...');
            
            const response = await axios.get(url, {
                maxRedirects: 10,
                timeout: this.timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                },
                validateStatus: () => true
            });

            const html = response.data;
            console.log('📄 DouyinAPIDirect: HTML长度:', html.length);

            // 提取视频信息
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const descMatch = html.match(/data-desc="([^"]+)"/i) || html.match(/description[^>]*content="([^"]+)"/i);
            const authorMatch = html.match(/data-author="([^"]+)"/i) || html.match(/"nickname":"([^"]+)"/i);
            
            // 尝试从 window._ROUTER_DATA 提取更准确的数据
            let routerData = null;
            try {
                const routerDataMatch = html.match(/window\._ROUTER_DATA\s*=\s*({.+?});/s) || 
                                       html.match(/window\._ROUTER_DATA\s*=\s*({.+?})<\/script>/s);
                if (routerDataMatch) {
                    console.log('🔍 找到 _ROUTER_DATA，开始解析...');
                    routerData = JSON.parse(routerDataMatch[1]);
                    console.log('✅ _ROUTER_DATA 解析成功');
                } else {
                    console.log('⚠️ 未找到 _ROUTER_DATA');
                }
            } catch (e) {
                console.log('❌ 解析 _ROUTER_DATA 失败:', e.message);
            }

            // 优先使用 _ROUTER_DATA 中的数据
            let likeCount = 0, commentCount = 0, shareCount = 0, playCount = 0, collectCount = 0, forwardCount = 0;
            
            if (routerData && routerData.loaderData && routerData.loaderData['video_(id)/page'] && 
                routerData.loaderData['video_(id)/page'].videoInfoRes && 
                routerData.loaderData['video_(id)/page'].videoInfoRes.item_list && 
                routerData.loaderData['video_(id)/page'].videoInfoRes.item_list[0] &&
                routerData.loaderData['video_(id)/page'].videoInfoRes.item_list[0].statistics) {
                
                const stats = routerData.loaderData['video_(id)/page'].videoInfoRes.item_list[0].statistics;
                likeCount = stats.digg_count || 0;
                commentCount = stats.comment_count || 0;
                shareCount = stats.share_count || 0;
                playCount = stats.play_count || 0;
                collectCount = stats.collect_count || 0;
                forwardCount = stats.forward_count || 0;
                
                console.log('📊 从 _ROUTER_DATA 提取统计数据:', {
                    likeCount, commentCount, shareCount, playCount, collectCount, forwardCount
                });
            } else {
                // 备用方法：从HTML中提取
                const likeMatch = html.match(/"digg_count":(\d+)/);
                const commentMatch = html.match(/"comment_count":(\d+)/);
                const shareMatch = html.match(/"share_count":(\d+)/);
                const playMatch = html.match(/"play_count":(\d+)/);
                const collectMatch = html.match(/"collect_count":(\d+)/);
                const forwardMatch = html.match(/"forward_count":(\d+)/);
                
                likeCount = likeMatch ? parseInt(likeMatch[1]) : 0;
                commentCount = commentMatch ? parseInt(commentMatch[1]) : 0;
                shareCount = shareMatch ? parseInt(shareMatch[1]) : 0;
                playCount = playMatch ? parseInt(playMatch[1]) : 0;
                collectCount = collectMatch ? parseInt(collectMatch[1]) : 0;
                forwardCount = forwardMatch ? parseInt(forwardMatch[1]) : 0;
                
                console.log('📊 从HTML提取统计数据:', {
                    likeCount, commentCount, shareCount, playCount, collectCount, forwardCount
                });
            }
            
            // 优先从 _ROUTER_DATA 中提取视频URL
            let videoUrl = null;
            let videoId = null;
            
            if (routerData && routerData.loaderData && routerData.loaderData['video_(id)/page'] && 
                routerData.loaderData['video_(id)/page'].videoInfoRes && 
                routerData.loaderData['video_(id)/page'].videoInfoRes.item_list && 
                routerData.loaderData['video_(id)/page'].videoInfoRes.item_list[0] &&
                routerData.loaderData['video_(id)/page'].videoInfoRes.item_list[0].video) {
                
                const videoData = routerData.loaderData['video_(id)/page'].videoInfoRes.item_list[0].video;
                videoId = videoData.play_addr?.uri;
                
                if (videoId) {
                    // 生成无水印URL
                    videoUrl = `https://aweme.snssdk.com/aweme/v1/play/?video_id=${videoId}&ratio=720p&line=0`;
                    console.log('🎬 从 _ROUTER_DATA 生成无水印URL:', videoUrl);
                }
            }
            
            // 如果没找到，使用备用方法
            if (!videoUrl) {
                const videoUrlMatch = html.match(/"video":\{"play_addr":\{[^}]+"url_list":\["([^"]+)"/);
                let originalUrl = videoUrlMatch ? videoUrlMatch[1] : null;
                
                // 如果没找到，尝试其他模式
                if (!originalUrl) {
                    const playAddrMatch = html.match(/"play_addr":\{"url_list":\["([^"]+)"/);
                    originalUrl = playAddrMatch ? playAddrMatch[1] : null;
                }
                
                if (originalUrl) {
                    // 解码URL
                    originalUrl = originalUrl.replace(/\\u002F/g, '/');
                    originalUrl = decodeURIComponent(originalUrl);
                    
                    // 尝试转换为无水印URL
                    const videoIdMatch = originalUrl.match(/video_id=([^&]+)/);
                    if (videoIdMatch) {
                        videoId = videoIdMatch[1];
                        videoUrl = `https://aweme.snssdk.com/aweme/v1/play/?video_id=${videoId}&ratio=720p&line=0`;
                        console.log('🎬 从HTML生成无水印URL:', videoUrl);
                    } else {
                        videoUrl = originalUrl;
                        console.log('🎬 使用原始URL:', videoUrl);
                    }
                }
            }
            
            // 提取封面URL
            const coverMatch = html.match(/"cover":\{"url_list":\["([^"]+)"/);
            const coverUrl = coverMatch ? coverMatch[1] : null;
            
            // 提取音乐信息
            const musicTitleMatch = html.match(/"music":\{"title":"([^"]+)"/);
            const musicAuthorMatch = html.match(/"music":\{"author":"([^"]+)"/);
            const musicUrlMatch = html.match(/"music":\{"play_url":\{"url_list":\["([^"]+)"/);
            
            // 提取标签
            const hashtagMatches = html.match(/"hashtag_name":"([^"]+)"/g);
            const hashtags = hashtagMatches ? hashtagMatches.map(match => match.match(/"hashtag_name":"([^"]+)"/)[1]) : [];

            const result = {
                success: true,
                author: authorMatch ? authorMatch[1] : '未知作者',
                authorId: '',
                publishTime: new Date().toLocaleDateString('zh-CN'),
                // 统计数据
                likeCount: likeCount,
                commentCount: commentCount,
                shareCount: shareCount,
                playCount: playCount,
                collectCount: collectCount,
                forwardCount: forwardCount,
                // 视频信息
                description: descMatch ? descMatch[1] : '无描述',
                videoUrl: videoUrl,
                coverUrl: coverUrl,
                videoId: videoId,
                duration: 0,
                width: 0,
                height: 0,
                // 额外信息
                musicTitle: musicTitleMatch ? musicTitleMatch[1] : '',
                musicAuthor: musicAuthorMatch ? musicAuthorMatch[1] : '',
                musicUrl: musicUrlMatch ? musicUrlMatch[1] : '',
                hashtags: hashtags
            };

            console.log('📋 DouyinAPIDirect: 解析结果:');
            console.log('- 作者:', result.author);
            console.log('- 点赞数:', result.likeCount);
            console.log('- 评论数:', result.commentCount);
            console.log('- 分享数:', result.shareCount);
            console.log('- 播放数:', result.playCount);
            console.log('- 视频URL:', result.videoUrl ? '已获取' : '未获取');
            console.log('- 标签数量:', result.hashtags.length);

            return result;

        } catch (error) {
            console.log('❌ DouyinAPIDirect: HTML解析失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 展开短链接
     * @param {string} url 短链接
     * @returns {Promise<string>} 完整链接
     */
    async expandShortUrl(url) {
        if (!url.includes('v.douyin.com')) {
            return url;
        }

        try {
            const response = await axios.get(url, {
                maxRedirects: 10,
                timeout: this.timeout,
                headers: this.baseHeaders,
                validateStatus: () => true // 接受所有状态码
            });

            return response.request.res.responseUrl || url;
        } catch (error) {
            console.log('⚠️ DouyinAPIDirect: 短链接展开失败:', error.message);
            return url;
        }
    }

    /**
     * 从URL中提取视频ID
     * @param {string} url 视频链接
     * @returns {string} 视频ID
     */
    extractVideoId(url) {
        const patterns = [
            /\/video\/(\d+)/,
            /\/share\/video\/(\d+)/,
            /aweme_id=(\d+)/,
            /modal_id=(\d+)/,
            /\/(\d{19})/,  // 19位数字ID
            /\/(\d{18})/,  // 18位数字ID
            /item_ids=(\d+)/,
            /\/note\/(\d+)/,
            /\/(\d{15,})/  // 15位以上数字ID
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    }

    /**
     * 尝试多个API端点
     * @param {string} videoId 视频ID
     * @param {string} fullUrl 完整URL
     * @returns {Promise<Object>} API响应结果
     */
    async tryMultipleEndpoints(videoId, fullUrl) {
        const endpoints = [
            {
                name: '抖音官方API v2',
                url: `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`,
                parser: this.parseOfficialApiV2.bind(this),
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Referer': 'https://www.iesdouyin.com/',
                    'Origin': 'https://www.iesdouyin.com',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-site'
                }
            },
            {
                name: '抖音移动端API',
                url: `https://www.douyin.com/aweme/v1/web/aweme/detail/?aweme_id=${videoId}`,
                parser: this.parseMobileApi.bind(this),
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Referer': 'https://www.douyin.com/',
                    'Origin': 'https://www.douyin.com',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            },
            {
                name: '抖音网页API',
                url: `https://www.douyin.com/aweme/v1/web/aweme/detail/?aweme_id=${videoId}&aid=1128&version_name=23.5.0&device_platform=webapp&os_version=10`,
                parser: this.parseWebApi.bind(this),
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Referer': 'https://www.douyin.com/',
                    'Origin': 'https://www.douyin.com',
                    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"macOS"'
                }
            },
            {
                name: '抖音备用API',
                url: `https://www.douyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`,
                parser: this.parseOfficialApiV2.bind(this),
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Referer': 'https://www.douyin.com/',
                    'Origin': 'https://www.douyin.com'
                }
            },
            {
                name: '抖音新API',
                url: `https://www.douyin.com/aweme/v1/web/aweme/detail/?aweme_id=${videoId}&aid=1128&version_name=23.5.0&device_platform=webapp&os_version=10&channel=channel_pc_web&update_version_code=170400&pc_client_type=1`,
                parser: this.parseWebApi.bind(this),
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Referer': 'https://www.douyin.com/',
                    'Origin': 'https://www.douyin.com',
                    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"macOS"'
                }
            }
        ];

        for (const endpoint of endpoints) {
            try {
                console.log(`🔄 DouyinAPIDirect: 尝试 ${endpoint.name}...`);
                
                const headers = { ...endpoint.headers };
                if (this.cookies) {
                    headers['Cookie'] = this.cookies;
                }
                if (this.token) {
                    headers['X-Token'] = this.token;
                }

                const response = await axios.get(endpoint.url, {
                    headers,
                    timeout: this.timeout,
                    validateStatus: (status) => status < 500
                });

                console.log(`📊 DouyinAPIDirect: ${endpoint.name} 响应状态:`, response.status);
                console.log(`📊 DouyinAPIDirect: ${endpoint.name} 响应数据:`, JSON.stringify(response.data, null, 2));

                if (response.status === 200 && response.data) {
                    const result = endpoint.parser(response.data);
                    if (result && result.success) {
                        console.log(`✅ DouyinAPIDirect: ${endpoint.name} 解析成功`);
                        return result;
                    } else {
                        console.log(`⚠️ DouyinAPIDirect: ${endpoint.name} 解析失败:`, result?.error || '未知错误');
                    }
                } else {
                    console.log(`⚠️ DouyinAPIDirect: ${endpoint.name} 响应异常:`, response.status, response.data);
                }

            } catch (error) {
                console.log(`❌ DouyinAPIDirect: ${endpoint.name} 失败:`, error.message);
            }
        }

        return null;
    }

    /**
     * 解析官方API v2响应
     * @param {Object} data API响应数据
     * @returns {Object} 解析结果
     */
    parseOfficialApiV2(data) {
        try {
            console.log('🔍 DouyinAPIDirect: 解析官方API v2数据:', JSON.stringify(data, null, 2));
            
            if (!data || typeof data !== 'object') {
                return { success: false, error: 'API返回数据格式错误' };
            }

            if (!data.item_list || !Array.isArray(data.item_list) || data.item_list.length === 0) {
                console.log('⚠️ DouyinAPIDirect: item_list为空或不存在');
                return { success: false, error: '没有找到视频数据' };
            }

            const item = data.item_list[0];
            if (!item) {
                return { success: false, error: '视频数据为空' };
            }

            console.log('✅ DouyinAPIDirect: 找到视频数据:', item.aweme_id);
            return this.formatVideoData(item);
        } catch (error) {
            console.error('❌ DouyinAPIDirect: 解析官方API v2失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 解析移动端API响应
     * @param {Object} data API响应数据
     * @returns {Object} 解析结果
     */
    parseMobileApi(data) {
        try {
            console.log('🔍 DouyinAPIDirect: 解析移动端API数据:', JSON.stringify(data, null, 2));
            
            if (!data || typeof data !== 'object') {
                return { success: false, error: 'API返回数据格式错误' };
            }

            if (!data.aweme_detail) {
                console.log('⚠️ DouyinAPIDirect: aweme_detail不存在');
                return { success: false, error: '没有找到视频详情' };
            }

            console.log('✅ DouyinAPIDirect: 找到视频详情:', data.aweme_detail.aweme_id);
            return this.formatVideoData(data.aweme_detail);
        } catch (error) {
            console.error('❌ DouyinAPIDirect: 解析移动端API失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 解析网页API响应
     * @param {Object} data API响应数据
     * @returns {Object} 解析结果
     */
    parseWebApi(data) {
        try {
            console.log('🔍 DouyinAPIDirect: 解析网页API数据:', JSON.stringify(data, null, 2));
            
            if (!data || typeof data !== 'object') {
                return { success: false, error: 'API返回数据格式错误' };
            }

            if (!data.aweme_detail) {
                console.log('⚠️ DouyinAPIDirect: aweme_detail不存在');
                return { success: false, error: '没有找到视频详情' };
            }

            console.log('✅ DouyinAPIDirect: 找到视频详情:', data.aweme_detail.aweme_id);
            return this.formatVideoData(data.aweme_detail);
        } catch (error) {
            console.error('❌ DouyinAPIDirect: 解析网页API失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 格式化视频数据
     * @param {Object} item 原始视频数据
     * @returns {Object} 格式化后的数据
     */
    formatVideoData(item) {
        try {
            console.log('🔍 DouyinAPIDirect: 格式化视频数据:', JSON.stringify(item, null, 2));
            
            const result = {
                success: true,
                author: item.author?.nickname || '未知作者',
                authorId: item.author?.uid || '',
                publishTime: item.create_time ? 
                    new Date(item.create_time * 1000).toLocaleDateString('zh-CN') : 
                    '未知时间',
                // 统计数据
                likeCount: item.statistics?.digg_count || 0,
                commentCount: item.statistics?.comment_count || 0,
                shareCount: item.statistics?.share_count || 0,
                playCount: item.statistics?.play_count || item.statistics?.aweme_id || 0,
                collectCount: item.statistics?.collect_count || 0,
                forwardCount: item.statistics?.forward_count || 0,
                // 视频信息
                description: item.desc || item.content || '无描述',
                videoUrl: this.getVideoUrl(item),
                coverUrl: item.video?.cover?.url_list?.[0] || '',
                videoId: item.aweme_id,
                duration: item.video?.duration || 0,
                width: item.video?.width || 0,
                height: item.video?.height || 0,
                // 额外信息
                musicTitle: item.music?.title || '',
                musicAuthor: item.music?.author || '',
                musicUrl: item.music?.play_url?.url_list?.[0] || '',
                hashtags: item.text_extra?.map(tag => tag.hashtag_name).filter(Boolean) || []
            };

            console.log('📋 DouyinAPIDirect: 格式化后的视频数据:', {
                author: result.author,
                description: result.description?.substring(0, 50) + '...',
                videoUrl: result.videoUrl ? '已获取' : '未获取',
                videoId: result.videoId
            });

            return result;
        } catch (error) {
            console.error('❌ DouyinAPIDirect: 格式化视频数据失败:', error.message);
            return {
                success: false,
                error: `数据格式化失败: ${error.message}`
            };
        }
    }

    /**
     * 获取视频播放地址
     * @param {Object} item 视频数据
     * @returns {string} 视频URL
     */
    getVideoUrl(item) {
        const video = item.video;
        if (!video) {
            console.log('⚠️ DouyinAPIDirect: 视频对象不存在');
            return '';
        }

        console.log('🔍 DouyinAPIDirect: 视频对象结构:', JSON.stringify(video, null, 2));

        // 优先尝试生成无水印URL
        if (video.play_addr?.uri) {
            const videoId = video.play_addr.uri;
            const noWatermarkUrl = `https://aweme.snssdk.com/aweme/v1/play/?video_id=${videoId}&ratio=720p&line=0`;
            console.log(`🎬 DouyinAPIDirect: 生成无水印URL: ${noWatermarkUrl}`);
            return noWatermarkUrl;
        }

        // 备用方法：从现有URL中提取video_id
        const urlSources = [
            { name: 'play_addr', urls: video.play_addr?.url_list },
            { name: 'download_addr', urls: video.download_addr?.url_list },
            { name: 'bit_rate[0]', urls: video.bit_rate?.[0]?.play_addr?.url_list },
            { name: 'bit_rate_normal', urls: video.bit_rate?.find(br => br.quality_type === 'normal')?.play_addr?.url_list },
            { name: 'play_addr_h264', urls: video.play_addr_h264?.url_list },
            { name: 'play_addr_265', urls: video.play_addr_265?.url_list },
            { name: 'play_addr_lowbr', urls: video.play_addr_lowbr?.url_list },
            { name: 'play_addr_highbr', urls: video.play_addr_highbr?.url_list }
        ];

        for (const source of urlSources) {
            if (source.urls && source.urls.length > 0) {
                console.log(`✅ DouyinAPIDirect: 找到视频源 ${source.name}:`, source.urls);
                
                // 优先选择非 .m3u8 格式的链接
                const mp4Url = source.urls.find(url => !url.includes('.m3u8'));
                if (mp4Url) {
                    // 尝试从URL中提取video_id并生成无水印URL
                    const videoIdMatch = mp4Url.match(/video_id=([^&]+)/);
                    if (videoIdMatch) {
                        const videoId = videoIdMatch[1];
                        const noWatermarkUrl = `https://aweme.snssdk.com/aweme/v1/play/?video_id=${videoId}&ratio=720p&line=0`;
                        console.log(`🎬 DouyinAPIDirect: 从URL提取video_id生成无水印URL: ${noWatermarkUrl}`);
                        return noWatermarkUrl;
                    }
                    
                    console.log(`🎬 DouyinAPIDirect: 选择MP4链接: ${mp4Url}`);
                    return mp4Url;
                }
                
                // 如果没有mp4，返回第一个链接
                const firstUrl = source.urls[0];
                console.log(`🎬 DouyinAPIDirect: 选择第一个链接: ${firstUrl}`);
                return firstUrl;
            }
        }

        console.log('❌ DouyinAPIDirect: 未找到任何视频链接');
        return '';
    }

    /**
     * 验证视频URL是否可访问
     * @param {string} videoUrl 视频URL
     * @returns {Promise<boolean>} 是否可访问
     */
    async validateVideoUrl(videoUrl) {
        if (!videoUrl) return false;

        try {
            const response = await axios.head(videoUrl, {
                headers: this.baseHeaders,
                timeout: 5000,
                validateStatus: (status) => status < 400
            });

            return response.status === 200;
        } catch (error) {
            console.log('⚠️ DouyinAPIDirect: 视频URL验证失败:', error.message);
            return false;
        }
    }
}

module.exports = DouyinAPIDirect;
