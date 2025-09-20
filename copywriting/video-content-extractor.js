// 专门的视频文案提取工具
const axios = require('axios');

class VideoContentExtractor {
    constructor() {
        this.userAgents = [
            'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Android 10; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ];
    }

    /**
     * 提取视频完整文案
     * @param {string} url - 视频URL
     * @returns {Object} 提取结果
     */
    async extractVideoContent(url) {
        console.log('📝 开始提取视频完整文案...');
        
        try {
            // 步骤1: 获取页面HTML
            const html = await this.fetchPageHtml(url);
            if (!html) {
                throw new Error('无法获取页面HTML');
            }

            // 步骤2: 提取结构化数据
            const structuredData = this.extractStructuredData(html);
            
            // 步骤3: 提取JSON数据
            const jsonData = this.extractJsonData(html);
            
            // 步骤4: 提取页面文本
            const pageText = this.extractPageText(html);
            
            // 步骤5: 合并和优化内容
            const finalContent = this.mergeAndOptimizeContent({
                structured: structuredData,
                json: jsonData,
                page: pageText,
                url: url
            });

            console.log('✅ 文案提取完成');
            return {
                success: true,
                content: finalContent,
                source: 'multi-source',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ 文案提取失败:', error.message);
            return {
                success: false,
                error: error.message,
                content: this.createFallbackContent(url)
            };
        }
    }

    /**
     * 获取页面HTML
     * @param {string} url - 页面URL
     * @returns {string} HTML内容
     */
    async fetchPageHtml(url) {
        console.log('🌐 获取页面HTML...');
        
        const headers = {
            'User-Agent': this.getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://www.douyin.com/',
            'Origin': 'https://www.douyin.com',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Upgrade-Insecure-Requests': '1'
        };

        try {
            const response = await axios.get(url, {
                headers: headers,
                timeout: 15000,
                maxRedirects: 5,
                validateStatus: (status) => status < 400
            });

            console.log('✅ HTML获取成功，长度:', response.data.length);
            return response.data;

        } catch (error) {
            console.error('❌ HTML获取失败:', error.message);
            throw error;
        }
    }

    /**
     * 提取结构化数据
     * @param {string} html - HTML内容
     * @returns {Object} 结构化数据
     */
    extractStructuredData(html) {
        console.log('🔍 提取结构化数据...');
        
        const data = {
            title: '',
            description: '',
            author: '',
            publishTime: '',
            likeCount: 0,
            commentCount: 0,
            shareCount: 0,
            tags: [],
            music: '',
            location: ''
        };

        try {
            // 提取标题
            const titlePatterns = [
                /<title>([^<]+)</i,
                /<meta\s+property="og:title"\s+content="([^"]+)"/i,
                /<meta\s+name="title"\s+content="([^"]+)"/i,
                /"title":"([^"]+)"/i
            ];
            
            for (const pattern of titlePatterns) {
                const match = html.match(pattern);
                if (match && match[1].trim()) {
                    data.title = this.cleanText(match[1]);
                    break;
                }
            }

            // 提取描述
            const descPatterns = [
                /<meta\s+property="og:description"\s+content="([^"]+)"/i,
                /<meta\s+name="description"\s+content="([^"]+)"/i,
                /"desc":"([^"]+)"/i,
                /"description":"([^"]+)"/i
            ];
            
            for (const pattern of descPatterns) {
                const match = html.match(pattern);
                if (match && match[1].trim()) {
                    data.description = this.cleanText(match[1]);
                    break;
                }
            }

            // 提取作者信息
            const authorPatterns = [
                /"nickname":"([^"]+)"/i,
                /"author":\s*{[^}]*"nickname":\s*"([^"]+)"/i,
                /<meta\s+property="article:author"\s+content="([^"]+)"/i
            ];
            
            for (const pattern of authorPatterns) {
                const match = html.match(pattern);
                if (match && match[1].trim()) {
                    data.author = this.cleanText(match[1]);
                    break;
                }
            }

            // 提取统计数据
            const statsPatterns = [
                /"digg_count":(\d+)/i,
                /"comment_count":(\d+)/i,
                /"share_count":(\d+)/i,
                /"play_count":(\d+)/i
            ];
            
            for (const pattern of statsPatterns) {
                const match = html.match(pattern);
                if (match) {
                    const count = parseInt(match[1]);
                    if (pattern.source.includes('digg')) data.likeCount = count;
                    else if (pattern.source.includes('comment')) data.commentCount = count;
                    else if (pattern.source.includes('share')) data.shareCount = count;
                }
            }

            // 提取标签
            const tagPatterns = [
                /"text":"#([^"]+)"/gi,
                /#([a-zA-Z0-9\u4e00-\u9fa5]+)/g
            ];
            
            for (const pattern of tagPatterns) {
                const matches = html.match(pattern);
                if (matches) {
                    data.tags = matches.map(match => {
                        const tag = match.replace(/["#]/g, '').trim();
                        return tag.length > 0 ? tag : null;
                    }).filter(Boolean);
                    break;
                }
            }

            // 提取音乐信息
            const musicPatterns = [
                /"music":\s*{[^}]*"title":\s*"([^"]+)"/i,
                /"music_title":"([^"]+)"/i
            ];
            
            for (const pattern of musicPatterns) {
                const match = html.match(pattern);
                if (match && match[1].trim()) {
                    data.music = this.cleanText(match[1]);
                    break;
                }
            }

            console.log('✅ 结构化数据提取完成');
            return data;

        } catch (error) {
            console.error('❌ 结构化数据提取失败:', error.message);
            return data;
        }
    }

    /**
     * 提取JSON数据
     * @param {string} html - HTML内容
     * @returns {Object} JSON数据
     */
    extractJsonData(html) {
        console.log('📊 提取JSON数据...');
        
        const jsonData = {
            awemeData: null,
            pageData: null,
            userData: null
        };

        try {
            // 提取aweme数据
            const awemePatterns = [
                /window\._SSR_HYDRATED_DATA\s*=\s*({.+?});/i,
                /window\.__INITIAL_STATE__\s*=\s*({.+?});/i,
                /"aweme_detail":\s*({.+?})/i,
                /"item_list":\s*\[({.+?})\]/i
            ];
            
            for (const pattern of awemePatterns) {
                const match = html.match(pattern);
                if (match) {
                    try {
                        jsonData.awemeData = JSON.parse(match[1]);
                        console.log('✅ 提取到aweme数据');
                        break;
                    } catch (e) {
                        console.log('⚠️ aweme数据解析失败:', e.message);
                    }
                }
            }

            // 提取页面数据
            const pagePatterns = [
                /window\.pageData\s*=\s*({.+?});/i,
                /window\.__NUXT__\s*=\s*({.+?});/i
            ];
            
            for (const pattern of pagePatterns) {
                const match = html.match(pattern);
                if (match) {
                    try {
                        jsonData.pageData = JSON.parse(match[1]);
                        console.log('✅ 提取到页面数据');
                        break;
                    } catch (e) {
                        console.log('⚠️ 页面数据解析失败:', e.message);
                    }
                }
            }

            // 提取用户数据
            const userPatterns = [
                /"user":\s*({.+?})/i,
                /"author":\s*({.+?})/i
            ];
            
            for (const pattern of userPatterns) {
                const match = html.match(pattern);
                if (match) {
                    try {
                        jsonData.userData = JSON.parse(match[1]);
                        console.log('✅ 提取到用户数据');
                        break;
                    } catch (e) {
                        console.log('⚠️ 用户数据解析失败:', e.message);
                    }
                }
            }

            return jsonData;

        } catch (error) {
            console.error('❌ JSON数据提取失败:', error.message);
            return jsonData;
        }
    }

    /**
     * 提取页面文本内容
     * @param {string} html - HTML内容
     * @returns {Object} 页面文本
     */
    extractPageText(html) {
        console.log('📄 提取页面文本...');
        
        const textData = {
            mainContent: '',
            comments: [],
            relatedVideos: []
        };

        try {
            // 移除脚本和样式标签
            let cleanHtml = html
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

            // 提取主要内容
            const contentPatterns = [
                /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
                /<div[^>]*class="[^"]*desc[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
                /<p[^>]*class="[^"]*desc[^"]*"[^>]*>([\s\S]*?)<\/p>/i
            ];
            
            for (const pattern of contentPatterns) {
                const match = cleanHtml.match(pattern);
                if (match && match[1].trim()) {
                    textData.mainContent = this.extractTextFromHtml(match[1]);
                    break;
                }
            }

            // 如果没有找到主要内容，尝试提取所有文本
            if (!textData.mainContent) {
                textData.mainContent = this.extractTextFromHtml(cleanHtml);
            }

            // 提取评论
            const commentPatterns = [
                /"content":"([^"]+)"/gi,
                /<div[^>]*class="[^"]*comment[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
            ];
            
            for (const pattern of commentPatterns) {
                const matches = cleanHtml.match(pattern);
                if (matches) {
                    textData.comments = matches.slice(0, 10).map(match => {
                        const text = match.replace(/["<>]/g, '').trim();
                        return text.length > 0 ? text : null;
                    }).filter(Boolean);
                    break;
                }
            }

            console.log('✅ 页面文本提取完成');
            return textData;

        } catch (error) {
            console.error('❌ 页面文本提取失败:', error.message);
            return textData;
        }
    }

    /**
     * 合并和优化内容
     * @param {Object} data - 所有提取的数据
     * @returns {Object} 最终内容
     */
    mergeAndOptimizeContent(data) {
        console.log('🔄 合并和优化内容...');
        
        const finalContent = {
            title: '',
            description: '',
            fullContent: '',
            author: '',
            publishTime: '',
            stats: {
                likes: 0,
                comments: 0,
                shares: 0,
                views: 0
            },
            tags: [],
            music: '',
            location: '',
            comments: [],
            metadata: {
                source: 'multi-source',
                extractedAt: new Date().toISOString(),
                url: data.url
            }
        };

        try {
            // 合并标题
            finalContent.title = data.structured.title || 
                                data.json.awemeData?.title || 
                                data.json.pageData?.title || 
                                '抖音视频';

            // 合并描述
            finalContent.description = data.structured.description || 
                                     data.json.awemeData?.desc || 
                                     data.json.pageData?.description || 
                                     '';

            // 合并完整内容
            const contentParts = [
                finalContent.title,
                finalContent.description,
                data.page.mainContent
            ].filter(Boolean);
            
            finalContent.fullContent = contentParts.join('\n\n');

            // 合并作者信息
            finalContent.author = data.structured.author || 
                                data.json.awemeData?.author?.nickname || 
                                data.json.userData?.nickname || 
                                '抖音用户';

            // 合并统计数据
            finalContent.stats.likes = data.structured.likeCount || 
                                      data.json.awemeData?.statistics?.digg_count || 
                                      0;
            
            finalContent.stats.comments = data.structured.commentCount || 
                                         data.json.awemeData?.statistics?.comment_count || 
                                         0;
            
            finalContent.stats.shares = data.structured.shareCount || 
                                       data.json.awemeData?.statistics?.share_count || 
                                       0;

            // 合并标签
            finalContent.tags = data.structured.tags || 
                              data.json.awemeData?.text_extra?.map(item => item.hashtag_name) || 
                              [];

            // 合并音乐信息
            finalContent.music = data.structured.music || 
                               data.json.awemeData?.music?.title || 
                               '';

            // 合并评论
            finalContent.comments = data.page.comments || [];

            // 清理和优化内容
            finalContent.fullContent = this.cleanAndOptimizeContent(finalContent.fullContent);
            finalContent.description = this.cleanAndOptimizeContent(finalContent.description);

            console.log('✅ 内容合并完成');
            return finalContent;

        } catch (error) {
            console.error('❌ 内容合并失败:', error.message);
            return finalContent;
        }
    }

    /**
     * 清理和优化内容
     * @param {string} content - 原始内容
     * @returns {string} 清理后的内容
     */
    cleanAndOptimizeContent(content) {
        if (!content) return '';
        
        return content
            .replace(/\s+/g, ' ')  // 合并多个空格
            .replace(/\n\s*\n/g, '\n\n')  // 合并多个换行
            .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s\.,!?;:()（）【】""''#@]/g, '')  // 移除特殊字符
            .trim();
    }

    /**
     * 从HTML中提取纯文本
     * @param {string} html - HTML内容
     * @returns {string} 纯文本
     */
    extractTextFromHtml(html) {
        return html
            .replace(/<[^>]*>/g, '')  // 移除HTML标签
            .replace(/&nbsp;/g, ' ')  // 替换HTML实体
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();
    }

    /**
     * 清理文本
     * @param {string} text - 原始文本
     * @returns {string} 清理后的文本
     */
    cleanText(text) {
        if (!text) return '';
        
        return text
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\\\\/g, '\\')
            .trim();
    }

    /**
     * 创建备用内容
     * @param {string} url - 视频URL
     * @returns {Object} 备用内容
     */
    createFallbackContent(url) {
        return {
            title: '抖音视频',
            description: '无法获取完整文案，请手动复制',
            fullContent: `视频链接: ${url}\n\n无法自动获取完整文案，建议：\n1. 手动复制视频文案\n2. 使用手机端抖音APP\n3. 稍后重试`,
            author: '抖音用户',
            publishTime: new Date().toLocaleDateString('zh-CN'),
            stats: { likes: 0, comments: 0, shares: 0, views: 0 },
            tags: [],
            music: '',
            location: '',
            comments: [],
            metadata: {
                source: 'fallback',
                extractedAt: new Date().toISOString(),
                url: url
            }
        };
    }

    /**
     * 获取随机User-Agent
     * @returns {string} User-Agent
     */
    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }
}

// 测试函数
async function testVideoContentExtraction() {
    console.log('📝 测试视频文案提取');
    console.log('='.repeat(50));
    
    const extractor = new VideoContentExtractor();
    const testUrl = 'https://v.douyin.com/2nMRXsi8Jbk/';
    
    try {
        const result = await extractor.extractVideoContent(testUrl);
        
        if (result.success) {
            console.log('\n🎉 文案提取成功！');
            console.log('📊 结果:');
            console.log('   标题:', result.content.title);
            console.log('   作者:', result.content.author);
            console.log('   描述:', result.content.description);
            console.log('   完整内容:', result.content.fullContent.substring(0, 100) + '...');
            console.log('   标签:', result.content.tags.join(', '));
            console.log('   音乐:', result.content.music);
            console.log('   统计:', result.content.stats);
        } else {
            console.log('\n❌ 文案提取失败:', result.error);
        }
    } catch (error) {
        console.log('\n❌ 测试失败:', error.message);
    }
}

if (require.main === module) {
    testVideoContentExtraction().catch(console.error);
}

module.exports = VideoContentExtractor;
