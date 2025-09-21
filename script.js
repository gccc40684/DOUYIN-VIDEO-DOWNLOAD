class DouyinVideoExtractor {
    constructor() {
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.urlInput = document.getElementById('urlInput');
        this.fetchBtn = document.getElementById('fetchBtn');
        this.btnText = this.fetchBtn.querySelector('.btn-text');
        this.loadingContainer = this.fetchBtn.querySelector('.loading-container');

        this.videoInfo = document.getElementById('videoInfo');
        this.contentSection = document.getElementById('contentSection');
        this.downloadSection = document.getElementById('downloadSection');
        this.errorMessage = document.getElementById('errorMessage');

        // 视频信息元素
        this.videoTitle = document.getElementById('videoTitle');
        this.authorName = document.getElementById('authorName');
        this.publishTime = document.getElementById('publishTime');
        this.likeCount = document.getElementById('likeCount');
        this.commentCount = document.getElementById('commentCount');
        this.shareCount = document.getElementById('shareCount');
        this.videoId = document.getElementById('videoId');
        
        this.videoContent = document.getElementById('videoContent');
        this.downloadLink = document.getElementById('downloadLink');
        this.exportBtn = document.getElementById('exportBtn');
        this.errorText = document.getElementById('errorText');
        
        // 作者介绍卡片
        this.authorSection = document.getElementById('authorSection');
    }

    bindEvents() {
        this.fetchBtn.addEventListener('click', () => this.handleFetch());
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleFetch();
            }
        });
        this.exportBtn.addEventListener('click', () => this.exportContent());
    }

    async handleFetch() {
        const inputText = this.urlInput.value.trim();

        if (!inputText) {
            this.showError('请输入有效的抖音视频链接');
            return;
        }

        // 从输入文本中提取URL
        const url = this.extractUrlFromText(inputText);
        
        if (!url) {
            this.showError('未找到有效的抖音视频链接，请检查输入内容');
            return;
        }

        if (!this.isValidDouyinUrl(url)) {
            this.showError('请输入有效的抖音视频链接');
            return;
        }

        this.setLoading(true);
        this.hideAllSections();

        try {
            const videoData = await this.extractVideoInfo(url);
            this.displayVideoInfo(videoData);
        } catch (error) {
            console.error('获取视频信息失败:', error);
            this.showError('获取视频信息失败，请检查链接是否正确或稍后重试');
        } finally {
            this.setLoading(false);
        }
    }

    extractUrlFromText(text) {
        console.log('🔍 开始从文本中提取URL:', text);
        
        // 抖音URL的正则表达式模式
        const urlPatterns = [
            // 短链接格式
            /https?:\/\/v\.douyin\.com\/[A-Za-z0-9]+\/?/g,
            // 完整链接格式
            /https?:\/\/(?:www\.)?(?:douyin\.com|iesdouyin\.com)\/[^\s]+/g,
            // 包含@符号的链接（如 @https://v.douyin.com/xxx/）
            /@(https?:\/\/v\.douyin\.com\/[A-Za-z0-9]+\/?)/g
        ];

        let foundUrls = [];
        
        // 尝试所有模式
        urlPatterns.forEach((pattern, index) => {
            const matches = text.match(pattern);
            if (matches) {
                console.log(`📋 模式 ${index + 1} 找到匹配:`, matches);
                foundUrls.push(...matches);
            }
        });

        if (foundUrls.length === 0) {
            console.log('❌ 未找到任何URL');
            return null;
        }

        // 清理URL（去掉@符号，确保格式正确）
        const cleanedUrls = foundUrls.map(url => {
            // 去掉开头的@符号
            let cleaned = url.replace(/^@/, '');
            
            // 确保URL以/结尾（如果不是以/结尾）
            if (!cleaned.endsWith('/') && !cleaned.includes('?')) {
                cleaned += '/';
            }
            
            return cleaned;
        });

        console.log('🧹 清理后的URLs:', cleanedUrls);

        // 返回第一个有效的URL
        const validUrl = cleanedUrls[0];
        console.log('✅ 选择使用的URL:', validUrl);
        
        return validUrl;
    }

    isValidDouyinUrl(url) {
        const douyinPatterns = [
            /douyin\.com/,
            /iesdouyin\.com/,
            /v\.douyin\.com/,
            /www\.douyin\.com/
        ];

        return douyinPatterns.some(pattern => pattern.test(url));
    }

    async extractVideoInfo(url) {
        try {
            // 使用本地代理服务器
            return await this.useLocalProxy(url);
        } catch (error) {
            console.error('本地代理失败，尝试备用方案:', error);
            try {
                // 备用方案：使用可用的第三方API
                return await this.useWorkingAPI(url);
            } catch (error2) {
                console.error('备用API失败:', error2);
                // 最后方案：基础解析
                return await this.directParse(url);
            }
        }
    }

    async useLocalProxy(url) {
        const response = await fetch('/api/parse-douyin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: url })
        });

        if (!response.ok) {
            throw new Error(`代理服务器响应错误: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
            return result.data;
        }

        // 如果代理返回了基础信息但标记为失败，仍然使用这些信息
        if (result.data) {
            return result.data;
        }

        throw new Error(result.message || '代理解析失败');
    }

    async useWorkingAPI(url) {
        // 备用方案：再次尝试本地代理API
        try {
            console.log('🔄 备用方案：重试本地代理API');
            return await this.useLocalProxy(url);
        } catch (error) {
            console.error('备用方案也失败:', error);
            throw new Error('所有API都不可用，请检查网络连接');
        }
    }

    async useThirdPartyAPI(url) {
        // 第三方API备用方案：也使用本地代理
        try {
            console.log('🔄 第三方API备用方案：使用本地代理');
            return await this.useLocalProxy(url);
        } catch (error) {
            console.error('第三方API备用方案失败:', error);
            throw new Error('所有解析方案都不可用');
        }
    }

    formatApiResponse(data) {
        const videoData = data.data || data.result || data;

        return {
            author: videoData.author?.nickname || videoData.nickname || '未知作者',
            publishTime: videoData.create_time ?
                new Date(videoData.create_time * 1000).toLocaleDateString('zh-CN') :
                '未知时间',
            likeCount: videoData.statistics?.digg_count || videoData.digg_count || 0,
            description: videoData.desc || videoData.title || '无描述',
            videoUrl: this.extractVideoUrl(videoData),
            videoId: videoData.aweme_id || this.extractVideoId(url)
        };
    }

    extractVideoUrl(videoData) {
        const video = videoData.video;
        if (!video) return '';

        return video.play_addr?.url_list?.[0] ||
               video.download_addr?.url_list?.[0] ||
               video.url || '';
    }

    async useCorsProxy(url) {
        // 使用CORS代理服务
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const targetUrl = this.buildDouyinApiUrl(url);

        const response = await fetch(proxyUrl + targetUrl, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            throw new Error('代理请求失败');
        }

        const data = await response.json();
        return this.parseDouyinResponse(data);
    }

    async directParse(url) {
        // 从URL直接提取可用信息
        const videoId = this.extractVideoId(url);

        return {
            author: '获取中...',
            publishTime: new Date().toLocaleDateString('zh-CN'),
            likeCount: 0,
            description: '由于跨域限制，无法直接获取完整信息。建议使用以下方式：\n\n1. 配置第三方API服务\n2. 部署后端代理服务\n3. 使用浏览器插件',
            videoUrl: '',
            videoId: videoId
        };
    }

    buildDouyinApiUrl(url) {
        const videoId = this.extractVideoId(url);
        return `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`;
    }

    parseDouyinResponse(data) {
        try {
            const item = data.item_list[0];
            return {
                author: item.author.nickname,
                publishTime: new Date(item.create_time * 1000).toLocaleDateString('zh-CN'),
                likeCount: item.statistics.digg_count,
                description: item.desc,
                videoUrl: item.video.play_addr.url_list[0],
                videoId: item.aweme_id
            };
        } catch (error) {
            throw new Error('解析响应数据失败');
        }
    }

    extractVideoId(url) {
        // 处理不同格式的抖音链接
        const patterns = [
            /\/video\/(\d+)/,
            /\/(\d+)/,
            /video_id=(\d+)/,
            /\/share\/video\/(\d+)/,
            /aweme_id=(\d+)/
        ];

        // 如果是短链接，先展开
        if (url.includes('v.douyin.com')) {
            // 这里需要处理短链接展开，实际项目中可能需要后端支持
            console.warn('检测到短链接，建议先展开为完整链接');
        }

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1];
            }
        }

        return Date.now().toString();
    }

    generateMockDownloadUrl(videoId) {
        return `https://example.com/download/video_${videoId}.mp4`;
    }

    async simulateApiDelay() {
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    }

    async extractVideoContentWithAPI(videoUrl) {
        try {
            const response = await fetch('/api/video-to-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ videoUrl })
            });

            if (!response.ok) {
                throw new Error('API请求失败');
            }

            const data = await response.json();
            return data.text || '无法提取视频文字内容';
        } catch (error) {
            console.error('视频转文字API调用失败:', error);
            return '由于技术限制，暂时无法提取视频中的语音文字内容。';
        }
    }

    displayVideoInfo(data) {
        // 显示所有视频信息
        this.videoTitle.textContent = data.title || data.description || '无标题';
        this.authorName.textContent = data.author || '未知作者';
        this.publishTime.textContent = data.publishTime || '未知时间';
        this.likeCount.textContent = this.formatNumber(data.likeCount || 0);
        this.commentCount.textContent = this.formatNumber(data.commentCount || 0);
        this.shareCount.textContent = this.formatNumber(data.shareCount || 0);
        this.videoId.textContent = data.videoId || '未知ID';
        
        this.videoContent.value = data.description || '暂无简介';

        // 添加文案提取按钮 - 已注释（文案提取功能已禁用）
        // this.addContentExtractButton(data);
        
        // 添加视频转文字按钮
        this.addVideoToTextButton(data);

        // 处理下载链接
        if (data.videoUrl && data.videoUrl.trim()) {
            this.downloadLink.href = data.videoUrl;
            this.downloadLink.style.display = 'inline-flex';
            this.downloadLink.style.background = 'linear-gradient(45deg, #ff3b30, #ff9500)';
            this.downloadLink.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                下载视频
            `;

            // 添加下载处理
            this.downloadLink.onclick = (e) => {
                e.preventDefault();
                this.handleVideoDownload(data.videoUrl, data.videoId);
            };
        } else {
            // 如果没有视频URL，修改按钮行为
            this.downloadLink.href = '#';
            this.downloadLink.onclick = (e) => {
                e.preventDefault();
                this.showNoVideoUrlMessage();
            };
            // 修改按钮文字和样式
            this.downloadLink.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                无法获取下载链接
            `;
            this.downloadLink.style.background = '#8e8e93';
        }

        this.showSection(this.videoInfo);
        this.showSection(this.contentSection);
        this.showSection(this.downloadSection);
    }

    handleVideoDownload(videoUrl, videoId) {
        // 创建下载选项弹窗
        const downloadModal = this.createDownloadModal(videoUrl, videoId);
        document.body.appendChild(downloadModal);

        setTimeout(() => {
            downloadModal.style.opacity = '1';
        }, 10);
    }

    createDownloadModal(videoUrl, videoId) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 32px;
            border-radius: 16px;
            max-width: 480px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
        `;

        content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3 style="margin: 0; color: #1d1d1f;">📹 视频下载</h3>
                <button id="closeModal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #8e8e93;">×</button>
            </div>

            <div style="background: #f2f2f7; padding: 16px; border-radius: 12px; margin-bottom: 20px;">
                <strong>视频地址（无水印）：</strong><br>
                <code style="word-break: break-all; font-size: 12px;">${videoUrl}</code>
            </div>

            <div style="display: grid; gap: 12px;">
                <button id="copyLink" style="padding: 12px 20px; background: #34c759; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                    📋 复制视频链接
                </button>

                <button id="downloadProxy" style="padding: 12px 20px; background: #ff9500; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500;">
                    ⬇️ 通过代理下载
                </button>
            </div>

            <div style="background: rgba(255, 149, 0, 0.1); padding: 16px; border-radius: 12px; margin-top: 20px; border: 1px solid rgba(255, 149, 0, 0.3);">
                <strong>💡 下载说明：</strong><br>
                • 复制链接：复制到剪贴板，可用其他工具下载<br>
                • 代理下载：尝试通过服务器代理下载<br><br>
                <small style="color: #8e8e93;">注意：某些视频链接可能有时效性限制</small>
            </div>
        `;

        modal.appendChild(content);

        // 绑定事件
        const closeBtn = content.querySelector('#closeModal');
        const copyBtn = content.querySelector('#copyLink');
        const proxyBtn = content.querySelector('#downloadProxy');

        closeBtn.onclick = () => this.closeModal(modal);
        modal.onclick = (e) => {
            if (e.target === modal) this.closeModal(modal);
        };

        copyBtn.onclick = () => {
            navigator.clipboard.writeText(videoUrl).then(() => {
                copyBtn.innerHTML = '✅ 已复制';
                setTimeout(() => {
                    copyBtn.innerHTML = '📋 复制视频链接';
                }, 2000);
            }).catch(() => {
                alert('复制失败，请手动复制链接');
            });
        };

        proxyBtn.onclick = () => {
            this.downloadViaProxy(videoUrl, videoId);
            this.closeModal(modal);
        };

        return modal;
    }

    closeModal(modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
        }, 300);
    }

    async downloadViaProxy(videoUrl, videoId) {
        try {
            const response = await fetch('/api/download-video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    videoUrl: videoUrl,
                    videoId: videoId
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `douyin_video_${videoId}.mp4`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                console.log('✅ 视频下载成功');
            } else {
                // 尝试解析错误信息
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { error: '未知错误' };
                }
                
                throw new Error(errorData.error || `服务器错误: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ 代理下载失败:', error);
            
            // 显示详细的错误信息
            let errorMessage = '代理下载失败';
            let suggestion = '请尝试其他方式';
            
            if (error.message.includes('网络连接被重置')) {
                errorMessage = '网络连接被重置';
                suggestion = '请检查网络连接后重试';
            } else if (error.message.includes('请求超时')) {
                errorMessage = '下载超时';
                suggestion = '请检查网络速度或稍后重试';
            } else if (error.message.includes('无法找到视频服务器')) {
                errorMessage = '视频链接已失效';
                suggestion = '请重新获取视频信息';
            } else if (error.message.includes('服务器返回错误')) {
                errorMessage = '服务器拒绝访问';
                suggestion = '视频可能已被删除或限制访问';
            }
            
            this.showDownloadError(errorMessage, suggestion);
        }
    }

    showDownloadError(errorMessage, suggestion) {
        const modal = this.createInfoModal();
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>❌ 下载失败</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="error-info">
                        <p><strong>错误原因:</strong> ${errorMessage}</p>
                        <p><strong>解决建议:</strong> ${suggestion}</p>
                    </div>
                    <div class="alternative-methods">
                        <h4>其他下载方式:</h4>
                        <ol>
                            <li>复制视频链接到浏览器地址栏直接访问</li>
                            <li>使用第三方下载工具（如IDM、迅雷等）</li>
                            <li>尝试使用手机端抖音APP分享功能</li>
                        </ol>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.parentElement.parentElement.parentElement.remove()">我知道了</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加关闭事件
        modal.querySelector('.close-btn').onclick = () => modal.remove();
        modal.querySelector('.modal').onclick = (e) => {
            if (e.target === modal.querySelector('.modal')) modal.remove();
        };
        
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 100);
    }

    // 文案提取按钮功能 - 已注释（文案提取功能已禁用）
    /*
    addContentExtractButton(data) {
        // 移除现有的文案提取按钮
        const existingBtn = document.querySelector('.extract-content-btn');
        if (existingBtn) {
            existingBtn.remove();
        }

        // 创建文案提取按钮
        const extractBtn = document.createElement('button');
        extractBtn.className = 'extract-content-btn';
        extractBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
            </svg>
            提取完整文案
        `;
        
        extractBtn.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            margin: 10px 0;
            background: linear-gradient(45deg, #007AFF, #5856D6);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 122, 255, 0.3);
        `;

        extractBtn.onmouseover = () => {
            extractBtn.style.transform = 'translateY(-2px)';
            extractBtn.style.boxShadow = '0 6px 20px rgba(0, 122, 255, 0.4)';
        };

        extractBtn.onmouseout = () => {
            extractBtn.style.transform = 'translateY(0)';
            extractBtn.style.boxShadow = '0 4px 15px rgba(0, 122, 255, 0.3)';
        };

        extractBtn.onclick = () => {
            this.extractFullContent(data);
        };

        // 将按钮插入到视频内容区域
        const videoInfoSection = document.querySelector('.video-info');
        if (videoInfoSection) {
            videoInfoSection.appendChild(extractBtn);
        }
    }
    */

    // 文案提取功能 - 已注释（文案提取功能已禁用）
    /*
    async extractFullContent(data) {
        try {
            // 显示加载状态
            const extractBtn = document.querySelector('.extract-content-btn');
            if (extractBtn) {
                extractBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                    </svg>
                    正在提取...
                `;
                extractBtn.disabled = true;
            }

            console.log('📝 开始提取完整文案...');

            // 获取当前URL
            const currentUrl = document.querySelector('#urlInput').value;
            if (!currentUrl) {
                throw new Error('请先输入视频链接');
            }

            // 调用文案提取API
            const response = await fetch('/api/extract-content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: currentUrl
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ 文案提取成功');
                
                // 更新视频内容
                this.videoContent.value = result.data.fullContent || result.data.description;
                
                // 显示详细结果
                this.showContentExtractResult(result.data);
                
            } else {
                console.log('❌ 文案提取失败:', result.error);
                this.showContentExtractError(result.error);
            }

        } catch (error) {
            console.error('❌ 文案提取失败:', error);
            this.showContentExtractError(error.message);
        } finally {
            // 恢复按钮状态
            const extractBtn = document.querySelector('.extract-content-btn');
            if (extractBtn) {
                extractBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10,9 9,9 8,9"/>
                    </svg>
                    提取完整文案
                `;
                extractBtn.disabled = false;
            }
        }
    }
    */

    // 文案提取结果显示 - 已注释（文案提取功能已禁用）
    /*
    showContentExtractResult(data) {
        const modal = this.createInfoModal();
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📝 文案提取成功</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="content-section">
                        <h4>📄 完整文案</h4>
                        <textarea readonly style="width: 100%; height: 200px; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; line-height: 1.5;">${data.fullContent || data.description}</textarea>
                    </div>
                    
                    <div class="content-details" style="margin-top: 20px;">
                        <div class="detail-row">
                            <strong>标题:</strong> ${data.title || '无'}
                        </div>
                        <div class="detail-row">
                            <strong>作者:</strong> ${data.author || '无'}
                        </div>
                        <div class="detail-row">
                            <strong>标签:</strong> ${data.tags ? data.tags.join(', ') : '无'}
                        </div>
                        <div class="detail-row">
                            <strong>音乐:</strong> ${data.music || '无'}
                        </div>
                        <div class="detail-row">
                            <strong>统计:</strong> 点赞 ${data.stats?.likes || 0} | 评论 ${data.stats?.comments || 0} | 分享 ${data.stats?.shares || 0}
                        </div>
                    </div>
                    
                    <div class="action-buttons" style="margin-top: 20px; display: flex; gap: 10px;">
                        <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${(data.fullContent || data.description).replace(/'/g, "\\'")}'); alert('文案已复制到剪贴板！')">复制文案</button>
                        <button class="btn btn-secondary" onclick="document.querySelector('.modal').remove()">关闭</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加关闭事件
        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.onclick = () => modal.remove();
        }
        
        // 点击模态框背景关闭
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
        
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 100);
    }
    */

    // 文案提取错误显示 - 已注释（文案提取功能已禁用）
    /*
    showContentExtractError(error) {
        const modal = this.createInfoModal();
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>❌ 文案提取失败</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="error-info">
                        <p><strong>错误原因:</strong> ${error}</p>
                        <p><strong>解决建议:</strong></p>
                        <ul>
                            <li>检查网络连接</li>
                            <li>确认视频链接有效</li>
                            <li>尝试手动复制文案</li>
                            <li>稍后重试</li>
                        </ul>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.parentElement.parentElement.parentElement.remove()">我知道了</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加关闭事件
        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.onclick = () => modal.remove();
        }
        
        // 点击模态框背景关闭
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
        
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 100);
    }
    */

    addVideoToTextButton(data) {
        // 移除现有的视频转文字按钮
        const existingBtn = document.querySelector('.video-to-text-btn');
        if (existingBtn) {
            existingBtn.remove();
        }

        // 创建视频转文字按钮
        const videoBtn = document.createElement('button');
        videoBtn.className = 'video-to-text-btn';
        videoBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                <circle cx="12" cy="13" r="3"/>
            </svg>
            上传视频转文字
        `;
        
        videoBtn.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            margin: 10px 0;
            background: linear-gradient(45deg, #FF6B6B, #FF8E8E);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3);
        `;

        videoBtn.onmouseover = () => {
            videoBtn.style.transform = 'translateY(-2px)';
            videoBtn.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.4)';
        };

        videoBtn.onmouseout = () => {
            videoBtn.style.transform = 'translateY(0)';
            videoBtn.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.3)';
        };

        videoBtn.onclick = () => {
            this.showDevelopmentNotice();
        };

        // 将按钮插入到视频内容区域
        const videoInfoSection = document.querySelector('.video-info');
        if (videoInfoSection) {
            videoInfoSection.appendChild(videoBtn);
        }
    }

    showDevelopmentNotice() {
        const modal = this.createInfoModal();
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🚧 功能开发中</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="development-notice" style="text-align: center; padding: 20px;">
                        <div style="font-size: 48px; margin-bottom: 20px;">🚧</div>
                        <h4 style="color: #FF6B6B; margin-bottom: 16px;">视频转文字功能正在开发中</h4>
                        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                            我们正在努力开发视频转文字功能，预计将在未来版本中推出。<br>
                            感谢您的耐心等待！
                        </p>
                        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0; color: #666; font-size: 14px;">
                                <strong>开发进度：</strong> 功能设计完成，正在实现核心算法
                            </p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary modal-close-btn">我知道了</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加关闭事件
        const closeBtn = modal.querySelector('.close-btn');
        const modalCloseBtn = modal.querySelector('.modal-close-btn');
        
        if (closeBtn) {
            closeBtn.onclick = () => modal.remove();
        }
        
        if (modalCloseBtn) {
            modalCloseBtn.onclick = () => modal.remove();
        }
        
        // 点击模态框背景关闭
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
        
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 100);
    }

    showVideoUploadModal() {
        const modal = this.createInfoModal();
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📹 上传视频转文字</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="upload-section">
                        <div class="upload-area" id="uploadArea" style="
                            border: 2px dashed #007AFF;
                            border-radius: 12px;
                            padding: 40px 20px;
                            text-align: center;
                            background: rgba(0, 122, 255, 0.05);
                            cursor: pointer;
                            transition: all 0.3s ease;
                        ">
                            <div class="upload-icon" style="font-size: 48px; margin-bottom: 16px;">📹</div>
                            <div class="upload-text" style="font-size: 16px; color: #007AFF; margin-bottom: 8px;">
                                点击或拖拽上传视频文件
                            </div>
                            <div class="upload-hint" style="font-size: 14px; color: #666;">
                                支持 MP4、AVI、MOV 等格式，最大 100MB
                            </div>
                        </div>
                        
                        <input type="file" id="videoFileInput" accept="video/*" style="display: none;">
                        
                        <div class="file-info" id="fileInfo" style="display: none; margin-top: 16px; padding: 12px; background: #f5f5f5; border-radius: 8px;">
                            <div class="file-name" style="font-weight: 600; margin-bottom: 4px;"></div>
                            <div class="file-size" style="font-size: 14px; color: #666;"></div>
                        </div>
                        
                        <div class="upload-options" style="margin-top: 20px;">
                            <div class="option-group">
                                <label style="display: block; margin-bottom: 8px; font-weight: 600;">识别语言:</label>
                                <select id="languageSelect" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
                                    <option value="zh-CN">中文（简体）</option>
                                    <option value="zh-TW">中文（繁体）</option>
                                    <option value="en-US">英语（美国）</option>
                                    <option value="en-GB">英语（英国）</option>
                                    <option value="ja-JP">日语</option>
                                    <option value="ko-KR">韩语</option>
                                </select>
                            </div>
                            
                            <div class="option-group" style="margin-top: 16px;">
                                <label style="display: block; margin-bottom: 8px; font-weight: 600;">识别方式:</label>
                                <div style="display: flex; flex-direction: column; gap: 8px;">
                                    <label style="display: flex; align-items: center; cursor: pointer;">
                                        <input type="radio" name="recognitionType" value="system-audio" checked style="margin-right: 8px;">
                                        <span>系统音频录制（推荐）</span>
                                    </label>
                                    <label style="display: flex; align-items: center; cursor: pointer;">
                                        <input type="radio" name="recognitionType" value="microphone" style="margin-right: 8px;">
                                        <span>麦克风录制</span>
                                    </label>
                                    <label style="display: flex; align-items: center; cursor: pointer;">
                                        <input type="radio" name="recognitionType" value="online" style="margin-right: 8px;">
                                        <span>在线工具</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="action-buttons" style="margin-top: 24px; display: flex; gap: 12px;">
                            <button id="startConvertBtn" class="btn btn-primary" style="flex: 1; padding: 12px; background: #007AFF; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;" disabled>
                                开始转换
                            </button>
                        <button class="btn btn-secondary" onclick="document.querySelector('.modal').remove()" style="padding: 12px 20px; background: #f0f0f0; color: #333; border: none; border-radius: 8px; cursor: pointer;">
                            取消
                        </button>
                        </div>
                    </div>
                    
                    <div class="online-tools" style="margin-top: 20px; padding: 16px; background: rgba(0, 122, 255, 0.1); border-radius: 8px;">
                        <h4 style="margin: 0 0 12px 0; color: #007AFF;">💡 推荐在线工具</h4>
                        <div class="tool-list" style="display: flex; flex-direction: column; gap: 8px;">
                            <a href="https://www.kapwing.com/tools/transcribe" target="_blank" style="color: #007AFF; text-decoration: none; padding: 8px; background: white; border-radius: 6px;">
                                📝 Kapwing - 免费视频转文字
                            </a>
                            <a href="https://www.dictationer.com/zh/upload-file/video-to-text" target="_blank" style="color: #007AFF; text-decoration: none; padding: 8px; background: white; border-radius: 6px;">
                                🎤 Dictationer - 高精度语音识别
                            </a>
                            <a href="https://www.clideo.com/video-to-text" target="_blank" style="color: #007AFF; text-decoration: none; padding: 8px; background: white; border-radius: 6px;">
                                🎬 Clideo - 多格式视频转换
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加关闭事件
        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.onclick = () => modal.remove();
        }
        
        // 添加文件上传事件
        this.setupVideoUpload(modal);
        
        // 检查麦克风设备状态
        this.checkMicrophoneStatus(modal);
        
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 100);
    }

    setupVideoUpload(modal) {
        const uploadArea = modal.querySelector('#uploadArea');
        const fileInput = modal.querySelector('#videoFileInput');
        const fileInfo = modal.querySelector('#fileInfo');
        const startBtn = modal.querySelector('#startConvertBtn');
        
        // 点击上传区域
        uploadArea.onclick = () => {
            fileInput.click();
        };
        
        // 拖拽上传
        uploadArea.ondragover = (e) => {
            e.preventDefault();
            uploadArea.style.background = 'rgba(0, 122, 255, 0.1)';
            uploadArea.style.borderColor = '#007AFF';
        };
        
        uploadArea.ondragleave = (e) => {
            e.preventDefault();
            uploadArea.style.background = 'rgba(0, 122, 255, 0.05)';
            uploadArea.style.borderColor = '#007AFF';
        };
        
        uploadArea.ondrop = (e) => {
            e.preventDefault();
            uploadArea.style.background = 'rgba(0, 122, 255, 0.05)';
            uploadArea.style.borderColor = '#007AFF';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleVideoFile(files[0], fileInfo, startBtn);
            }
        };
        
        // 文件选择
        fileInput.onchange = (e) => {
            if (e.target.files.length > 0) {
                this.handleVideoFile(e.target.files[0], fileInfo, startBtn);
            }
        };
        
        // 开始转换
        startBtn.onclick = () => {
            const file = fileInput.files[0];
            const language = modal.querySelector('#languageSelect').value;
            const recognitionType = modal.querySelector('input[name="recognitionType"]:checked').value;
            
            this.convertVideoToText(file, language, recognitionType, modal);
        };
    }

    handleVideoFile(file, fileInfo, startBtn) {
        // 检查文件类型
        if (!file.type.startsWith('video/')) {
            alert('请选择视频文件！');
            return;
        }
        
        // 检查文件大小（100MB限制）
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            alert('文件大小不能超过100MB！');
            return;
        }
        
        // 显示文件信息
        fileInfo.style.display = 'block';
        fileInfo.querySelector('.file-name').textContent = file.name;
        fileInfo.querySelector('.file-size').textContent = `大小: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
        
        // 启用开始按钮
        startBtn.disabled = false;
        startBtn.style.background = '#007AFF';
    }

    async convertVideoToText(file, language, recognitionType, modal) {
        try {
            const startBtn = modal.querySelector('#startConvertBtn');
            startBtn.disabled = true;
            startBtn.innerHTML = '正在转换...';
            startBtn.style.background = '#ccc';
            
            console.log('🎬 开始视频转文字...');
            
            if (recognitionType === 'system-audio') {
                // 系统音频录制
                this.showSystemAudioRecordingModal(file, language);
            } else if (recognitionType === 'microphone') {
                // 麦克风录制
                this.showBrowserRecognitionModal(file, language);
            } else {
                // 在线工具推荐
                this.showOnlineToolsModal(file);
            }
            
            modal.remove();
            
        } catch (error) {
            console.error('❌ 视频转文字失败:', error);
            this.showVideoToTextError(error.message);
        }
    }

    async checkMicrophoneStatus(modal) {
        try {
            // 检查是否有可用的音频设备
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');
            
            const statusElement = modal.querySelector('.upload-hint');
            if (statusElement) {
                if (audioInputs.length === 0) {
                    statusElement.innerHTML = `
                        <div style="color: #ff6b6b; font-weight: 600; margin-bottom: 8px;">
                            ⚠️ 未检测到麦克风设备
                        </div>
                        <div style="font-size: 12px; color: #666;">
                            请检查麦克风连接，或使用在线工具进行转换
                        </div>
                    `;
                } else {
                    statusElement.innerHTML = `
                        <div style="color: #34c759; font-weight: 600; margin-bottom: 8px;">
                            ✅ 检测到 ${audioInputs.length} 个音频设备
                        </div>
                        <div style="font-size: 12px; color: #666;">
                            支持 MP4、AVI、MOV 等格式，最大 100MB
                        </div>
                    `;
                }
            }
            
            console.log('🎤 音频设备检测完成:', audioInputs.length, '个设备');
            
        } catch (error) {
            console.error('❌ 设备检测失败:', error);
            const statusElement = modal.querySelector('.upload-hint');
            if (statusElement) {
                statusElement.innerHTML = `
                    <div style="color: #ff6b6b; font-weight: 600; margin-bottom: 8px;">
                        ⚠️ 设备检测失败
                    </div>
                    <div style="font-size: 12px; color: #666;">
                        建议使用在线工具进行视频转文字
                    </div>
                `;
            }
        }
    }

    showSystemAudioRecordingModal(file, language) {
        const modal = this.createInfoModal();
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🎵 视频转文字处理</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="processing-status" style="text-align: center; margin: 20px 0;">
                        <div class="status-icon" style="font-size: 48px; margin-bottom: 16px;">⚡</div>
                        <div class="status-text" style="font-size: 16px; color: #007AFF;">正在准备处理...</div>
                    </div>
                    
                    <div class="processing-progress" style="margin: 20px 0;">
                        <div style="background: #f0f0f0; border-radius: 10px; height: 12px; overflow: hidden;">
                            <div id="progressBar" style="background: #007AFF; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                        </div>
                        <div id="progressText" style="text-align: center; margin-top: 8px; font-size: 14px; color: #666;">准备中...</div>
                    </div>
                    
                    <div class="processing-result" style="background: #f8f9fa; padding: 16px; border-radius: 8px; min-height: 120px; max-height: 300px; overflow-y: auto;">
                        <div class="result-text" style="font-size: 14px; line-height: 1.6; color: #333;">
                            <div style="text-align: center; color: #666;">
                                处理结果将显示在这里...
                            </div>
                        </div>
                    </div>
                    
                    <div class="processing-info" style="margin-top: 16px; padding: 12px; background: rgba(0, 122, 255, 0.1); border-radius: 8px;">
                        <strong>💡 处理说明:</strong>
                        <ul style="margin: 8px 0 0 20px; font-size: 14px;">
                            <li><strong>自动处理:</strong> 上传后自动开始后台处理</li>
                            <li><strong>4倍速处理:</strong> 快速处理，无需等待</li>
                            <li><strong>实时进度:</strong> 显示处理进度和状态</li>
                            <li><strong>直接输出:</strong> 处理完成后直接显示文字结果</li>
                        </ul>
                    </div>
                    
                    <div class="action-buttons" style="margin-top: 20px; text-align: center;">
                        <button class="btn btn-secondary" onclick="document.querySelector('.modal').remove()" style="padding: 12px 24px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer;">
                            关闭
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加关闭事件
        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.onclick = () => modal.remove();
        }
        
        // 自动开始处理
        this.startAutoProcessing(modal, file, language);
        
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 100);
    }

    // 自动开始处理
    async startAutoProcessing(modal, file, language) {
        const statusText = modal.querySelector('.status-text');
        const statusIcon = modal.querySelector('.status-icon');
        const progressBar = modal.querySelector('#progressBar');
        const progressText = modal.querySelector('#progressText');
        const resultText = modal.querySelector('.result-text');
        
        try {
            // 更新状态
            statusText.textContent = '正在从视频文件提取音频...';
            statusIcon.textContent = '🎵';
            progressText.textContent = '提取音频中...';
            
            // 开始音频提取
            await this.extractAudioFromVideo(file, language, resultText, progressBar, progressText, statusText, statusIcon);
            
        } catch (error) {
            console.error('❌ 自动处理失败:', error);
            
            // 显示错误信息
            statusText.textContent = '处理失败';
            statusIcon.textContent = '❌';
            progressText.textContent = '处理失败';
            
            resultText.innerHTML = `
                <div style="color: #ff6b6b; font-weight: 600; margin-bottom: 12px;">
                    ⚠️ 处理失败: ${error.message}
                </div>
                <div style="background: #fff3cd; padding: 12px; border-radius: 6px; border: 1px solid #ffeaa7;">
                    <strong>解决方案:</strong>
                    <ul style="margin: 8px 0 0 20px; font-size: 14px;">
                        <li>确保视频文件包含音频轨道</li>
                        <li>检查视频文件格式是否支持</li>
                        <li>尝试使用其他视频文件</li>
                        <li>或者使用在线工具进行转换</li>
                    </ul>
                </div>
                <div style="margin-top: 12px;">
                    <button onclick="location.reload()" style="padding: 8px 16px; background: #007AFF; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 8px;">
                        重新开始
                    </button>
                    <button onclick="document.querySelector('.modal').remove()" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        关闭
                    </button>
                </div>
            `;
        }
    }

    async checkSystemAudioStatus(modal) {
        try {
            // 检查浏览器支持
            if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                const statusText = modal.querySelector('.status-text');
                if (statusText) {
                    statusText.textContent = '浏览器不支持屏幕录制功能';
                }
                return;
            }
            
            // 检查音频设备
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
            
            const statusText = modal.querySelector('.status-text');
            if (statusText) {
                if (audioOutputs.length === 0) {
                    statusText.textContent = '⚠️ 未检测到音频输出设备';
                } else {
                    statusText.textContent = `✅ 检测到 ${audioOutputs.length} 个音频输出设备，准备录制系统音频`;
                }
            }
            
            console.log('🎵 音频输出设备检测完成:', audioOutputs.length, '个设备');
            
        } catch (error) {
            console.error('❌ 音频设备检测失败:', error);
            const statusText = modal.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = '⚠️ 音频设备检测失败';
            }
        }
    }

    // 后台处理视频转文字（4倍速，无预览）
    async extractAudioFromVideo(file, language, resultText, progressBar, progressText, statusText, statusIcon) {
        try {
            console.log('🎵 开始后台处理视频转文字...');
            
            // 更新状态显示
            statusText.textContent = '正在提取音频...';
            statusIcon.textContent = '🎵';
            progressText.textContent = '提取音频中...';
            
            // 显示处理状态
            resultText.innerHTML = `
                <div style="text-align: center; margin-bottom: 16px;">
                    <div style="font-size: 18px; font-weight: 600; color: #007AFF; margin-bottom: 8px;">
                        ⚡ 后台4倍速处理中...
                    </div>
                    <div style="font-size: 14px; color: #666; margin-bottom: 12px;">
                        正在后台处理，无需等待...
                    </div>
                </div>
            `;
            
            // 创建隐藏的视频元素（不显示）
            const video = document.createElement('video');
            video.style.display = 'none'; // 完全隐藏
            video.src = URL.createObjectURL(file);
            video.muted = true; // 静音播放
            video.playbackRate = 4; // 设置4倍速播放（浏览器支持的最大倍速）
            
            // 等待视频加载
            await new Promise((resolve, reject) => {
                video.onloadedmetadata = () => {
                    console.log('✅ 视频元数据加载完成');
                    console.log('📹 视频时长:', video.duration, '秒');
                    console.log('⚡ 设置4倍速播放，预计处理时间:', (video.duration / 4).toFixed(1), '秒');
                    resolve();
                };
                video.onerror = reject;
            });
            
            // 创建音频上下文
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaElementSource(video);
            const destination = audioContext.createMediaStreamDestination();
            
            // 连接音频节点
            source.connect(destination);
            
            // 创建MediaRecorder录制音频
            const mediaRecorder = new MediaRecorder(destination.stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            let audioChunks = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };
            
            mediaRecorder.onstop = async () => {
                try {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    console.log('🎵 音频提取完成，大小:', audioBlob.size, 'bytes');
                    
                    // 更新进度到50% - 音频提取完成
                    progressBar.style.width = '50%';
                    progressText.textContent = '音频提取完成，开始语音识别...';
                    statusText.textContent = '正在识别音频...';
                    statusIcon.textContent = '🎤';
                    
                    // 直接开始语音识别，不显示音频播放器
                    await this.performSpeechRecognition(audioBlob, language, resultText, progressBar, progressText, statusText, statusIcon);
                    
                } catch (error) {
                    console.error('❌ 语音识别失败:', error);
                    resultText.innerHTML = `
                        <div style="color: #ff6b6b; font-weight: 600; margin-bottom: 12px;">
                            ❌ 语音识别失败: ${error.message}
                        </div>
                        <div style="margin-top: 12px;">
                            <button onclick="location.reload()" style="padding: 8px 16px; background: #007AFF; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 8px;">
                                重新开始
                            </button>
                            <button onclick="document.querySelector('.modal').remove()" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer;">
                                关闭
                            </button>
                        </div>
                    `;
                } finally {
                    // 清理资源
                    audioContext.close();
                    URL.revokeObjectURL(video.src);
                }
            };
            
            // 开始录制
            mediaRecorder.start();
            console.log('🎵 开始后台录制音频...');
            
            // 播放视频（静音，20倍速，隐藏）
            video.play();
            console.log('⚡ 开始4倍速后台播放视频...');
            
            // 更新进度条 - 音频提取阶段 (0-50%)
            const updateProgress = () => {
                const videoProgress = (video.currentTime / video.duration) * 50; // 音频提取占50%
                progressBar.style.width = videoProgress + '%';
                progressText.textContent = `音频提取中... ${Math.round(videoProgress)}%`;
            };
            
            // 监听播放进度
            video.addEventListener('timeupdate', updateProgress);
            
            // 等待视频播放完成
            await new Promise((resolve) => {
                video.onended = () => {
                    console.log('🎵 4倍速视频播放完成');
                    mediaRecorder.stop();
                    resolve();
                };
            });
            
        } catch (error) {
            console.error('❌ 后台处理失败:', error);
            throw error;
        }
    }

    // 执行语音识别
    async performSpeechRecognition(audioBlob, language, resultText, progressBar, progressText, statusText, statusIcon) {
        try {
            console.log('🎤 开始语音识别...');
            
            // 检查浏览器支持
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                throw new Error('浏览器不支持语音识别功能，请使用Chrome、Edge或Safari浏览器');
            }
            
            // 创建音频URL
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // 创建音频元素
            const audio = document.createElement('audio');
            audio.src = audioUrl;
            audio.controls = true;
            
            // 创建语音识别实例
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = language;
            
            let finalText = '';
            let isRecognizing = false;
            
            // 更新状态显示
            statusText.textContent = '正在识别音频...';
            statusIcon.textContent = '🎤';
            progressText.textContent = '识别中...';
            
            // 更新UI显示（不显示音频播放器）
            resultText.innerHTML = `
                <div style="text-align: center; margin-bottom: 16px;">
                    <div style="font-size: 18px; font-weight: 600; color: #28a745; margin-bottom: 8px;">
                        🎤 正在识别音频...
                    </div>
                    <div style="font-size: 14px; color: #666; margin-bottom: 12px;">
                        后台处理中，请稍候...
                    </div>
                </div>
                <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #ddd; min-height: 100px;">
                    <div id="recognitionResult" style="font-size: 14px; line-height: 1.6;">
                        识别结果将显示在这里...
                    </div>
                </div>
            `;
            
            const recognitionResult = document.getElementById('recognitionResult');
            
            // 语音识别事件处理
            recognition.onstart = () => {
                console.log('🎤 开始语音识别');
                recognitionResult.innerHTML = '正在识别中...';
                
                // 更新进度到60% - 开始语音识别
                progressBar.style.width = '60%';
                progressText.textContent = '语音识别中... 60%';
            };
            
            recognition.onresult = (event) => {
                let currentFinal = '';
                let currentInterim = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        currentFinal += transcript;
                    } else {
                        currentInterim += transcript;
                    }
                }
                
                finalText += currentFinal;
                recognitionResult.innerHTML = finalText + currentInterim;
                console.log('📝 识别结果:', finalText + currentInterim);
                
                // 动态更新进度 (60-90%)
                const progress = 60 + (finalText.length / 100) * 30; // 基于文本长度估算进度
                const clampedProgress = Math.min(90, Math.max(60, progress));
                progressBar.style.width = clampedProgress + '%';
                progressText.textContent = `语音识别中... ${Math.round(clampedProgress)}%`;
            };
            
            recognition.onerror = (event) => {
                console.error('❌ 语音识别错误:', event.error);
                
                let errorMessage = '';
                let solutionHtml = '';
                
                if (event.error === 'not-allowed') {
                    errorMessage = '麦克风权限被拒绝';
                    solutionHtml = `
                        <div style="color: #ff6b6b; font-weight: 600; margin-bottom: 12px;">
                            ⚠️ 麦克风权限被拒绝
                        </div>
                        <div style="background: #fff3cd; padding: 12px; border-radius: 6px; border: 1px solid #ffeaa7;">
                            <strong>解决方案:</strong>
                            <ol style="margin: 8px 0 0 20px; font-size: 14px;">
                                <li><strong>点击浏览器地址栏左侧的🔒或🎤图标</strong></li>
                                <li>选择"允许"麦克风权限</li>
                                <li>刷新页面后重新尝试</li>
                                <li>或者使用"在线工具"进行转换</li>
                            </ol>
                        </div>
                        <div style="margin-top: 12px; padding: 8px; background: rgba(0, 122, 255, 0.1); border-radius: 6px;">
                            <strong>💡 权限设置步骤:</strong>
                            <ol style="margin: 4px 0 0 20px; font-size: 13px;">
                                <li>Chrome: 地址栏左侧🔒 → 麦克风 → 允许</li>
                                <li>Edge: 地址栏左侧🔒 → 麦克风 → 允许</li>
                                <li>Safari: Safari → 偏好设置 → 网站 → 麦克风 → 允许</li>
                            </ol>
                        </div>
                    `;
                } else if (event.error === 'no-speech') {
                    errorMessage = '未检测到语音';
                    solutionHtml = `
                        <div style="color: #ff6b6b; font-weight: 600; margin-bottom: 12px;">
                            ⚠️ 未检测到语音
                        </div>
                        <div style="background: #fff3cd; padding: 12px; border-radius: 6px; border: 1px solid #ffeaa7;">
                            <strong>可能原因:</strong>
                            <ul style="margin: 8px 0 0 20px; font-size: 14px;">
                                <li>音频文件没有声音内容</li>
                                <li>音频音量太小</li>
                                <li>音频格式不支持</li>
                                <li>网络连接问题</li>
                            </ul>
                        </div>
                    `;
                } else if (event.error === 'audio-capture') {
                    errorMessage = '音频捕获失败';
                    solutionHtml = `
                        <div style="color: #ff6b6b; font-weight: 600; margin-bottom: 12px;">
                            ⚠️ 音频捕获失败
                        </div>
                        <div style="background: #fff3cd; padding: 12px; border-radius: 6px; border: 1px solid #ffeaa7;">
                            <strong>解决方案:</strong>
                            <ul style="margin: 8px 0 0 20px; font-size: 14px;">
                                <li>检查麦克风设备是否正常工作</li>
                                <li>确保没有其他应用占用麦克风</li>
                                <li>尝试刷新页面重新开始</li>
                                <li>或者使用"在线工具"进行转换</li>
                            </ul>
                        </div>
                    `;
                } else if (event.error === 'network') {
                    errorMessage = '网络连接失败';
                    solutionHtml = `
                        <div style="color: #ff6b6b; font-weight: 600; margin-bottom: 12px;">
                            ⚠️ 网络连接失败
                        </div>
                        <div style="background: #fff3cd; padding: 12px; border-radius: 6px; border: 1px solid #ffeaa7;">
                            <strong>解决方案:</strong>
                            <ul style="margin: 8px 0 0 20px; font-size: 14px;">
                                <li>检查网络连接是否正常</li>
                                <li>尝试刷新页面重新开始</li>
                                <li>或者使用"在线工具"进行转换</li>
                            </ul>
                        </div>
                    `;
                } else {
                    errorMessage = `识别失败: ${event.error}`;
                    solutionHtml = `
                        <div style="color: #ff6b6b; font-weight: 600; margin-bottom: 12px;">
                            ⚠️ ${errorMessage}
                        </div>
                        <div style="background: #fff3cd; padding: 12px; border-radius: 6px; border: 1px solid #ffeaa7;">
                            <strong>建议:</strong>
                            <ul style="margin: 8px 0 0 20px; font-size: 14px;">
                                <li>尝试刷新页面重新开始</li>
                                <li>或者使用"在线工具"进行转换</li>
                            </ul>
                        </div>
                    `;
                }
                
                recognitionResult.innerHTML = solutionHtml + `
                    <div style="margin-top: 12px;">
                        <button onclick="location.reload()" style="padding: 8px 16px; background: #007AFF; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 8px;">
                            重新开始
                        </button>
                        <button onclick="document.querySelector('.modal').remove()" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            关闭
                        </button>
                    </div>
                `;
                
                isRecognizing = false;
                startRecognitionBtn.innerHTML = '开始语音识别';
                startRecognitionBtn.style.background = '#007AFF';
            };
            
            recognition.onend = () => {
                console.log('🎤 语音识别结束');
                isRecognizing = false;
                
                // 清理进度模拟器
                if (progressSimulator) {
                    clearInterval(progressSimulator);
                    progressSimulator = null;
                }
                
                if (finalText.trim()) {
                    // 更新状态显示
                    statusText.textContent = '识别完成';
                    statusIcon.textContent = '✅';
                    progressText.textContent = '处理完成 100%';
                    progressBar.style.width = '100%';
                    
                    recognitionResult.innerHTML = `
                        <div style="color: #28a745; font-weight: 600; margin-bottom: 8px;">
                            ✅ 识别完成
                        </div>
                        <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border: 1px solid #dee2e6;">
                            ${finalText}
                        </div>
                        <div style="margin-top: 12px;">
                            <button onclick="navigator.clipboard.writeText('${finalText.replace(/'/g, "\\'")}')" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 8px;">
                                复制文本
                            </button>
                            <button onclick="document.querySelector('.modal').remove()" style="padding: 8px 16px; background: #007AFF; color: white; border: none; border-radius: 6px; cursor: pointer;">
                                完成
                            </button>
                        </div>
                    `;
                }
            };
            
            // 检查麦克风权限并开始识别
            const checkMicrophonePermission = async () => {
                try {
                    // 先检查设备是否可用
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const audioDevices = devices.filter(device => device.kind === 'audioinput');
                    
                    if (audioDevices.length === 0) {
                        console.log('❌ 未检测到麦克风设备');
                        return false;
                    }
                    
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(track => track.stop());
                    console.log('✅ 麦克风权限检查通过');
                    return true;
                } catch (error) {
                    console.log('❌ 麦克风权限检查失败:', error.message);
                    return false;
                }
            };

            // 启动进度模拟器
            let progressSimulator = null;
            const startProgressSimulation = () => {
                let currentProgress = 60;
                progressSimulator = setInterval(() => {
                    if (currentProgress < 90 && isRecognizing) {
                        currentProgress += Math.random() * 3; // 随机增加进度
                        progressBar.style.width = currentProgress + '%';
                        progressText.textContent = `语音识别中... ${Math.round(currentProgress)}%`;
                    }
                }, 800);
            };

            // 自动开始识别
            setTimeout(async () => {
                const hasPermission = await checkMicrophonePermission();
                if (hasPermission) {
                    recognition.start();
                    isRecognizing = true;
                    startProgressSimulation(); // 开始进度模拟
                } else {
                    recognitionResult.innerHTML = `
                        <div style="color: #ff6b6b; font-weight: 600; margin-bottom: 12px;">
                            ⚠️ Web Speech API需要麦克风权限，但我们可以用更好的方案！
                        </div>
                        <div style="background: #fff3cd; padding: 12px; border-radius: 6px; border: 1px solid #ffeaa7;">
                            <strong>🚀 推荐方案:</strong>
                            <ol style="margin: 8px 0 0 20px; font-size: 14px;">
                                <li><strong>服务器端处理</strong>: 上传视频到服务器，后端处理音频提取和语音识别</li>
                                <li><strong>无需麦克风权限</strong>: 完全避免浏览器权限问题</li>
                                <li><strong>更准确</strong>: 使用专业的语音识别服务（如Whisper）</li>
                                <li><strong>更稳定</strong>: 不依赖浏览器API限制</li>
                            </ol>
                        </div>
                        <div style="margin-top: 12px; padding: 8px; background: rgba(0, 122, 255, 0.1); border-radius: 6px;">
                            <strong>💡 技术说明:</strong>
                            <ul style="margin: 4px 0 0 20px; font-size: 13px;">
                                <li>Web Speech API设计为实时语音识别，必须访问麦克风</li>
                                <li>即使有音频文件，SpeechRecognition仍需要麦克风权限</li>
                                <li>这是浏览器安全限制，无法绕过</li>
                                <li>服务器端处理是唯一可行的解决方案</li>
                            </ul>
                        </div>
                        <div style="margin-top: 12px;">
                            <button onclick="this.showServerSideSolution()" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 8px;">
                                查看服务器端方案
                            </button>
                            <button onclick="document.querySelector('.modal').remove()" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer;">
                                关闭
                            </button>
                        </div>
                    `;
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ 语音识别失败:', error);
            throw error;
        }
    }

    // 显示服务器端解决方案
    showServerSideSolution() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>🚀 服务器端视频转文字解决方案</h3>
                    <button class="close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #007AFF; margin-bottom: 12px;">💡 为什么需要服务器端处理？</h4>
                        <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 4px solid #007AFF;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6;">
                                <strong>Web Speech API的根本限制:</strong><br>
                                • 设计为实时语音识别，必须访问麦克风<br>
                                • 即使有音频文件，仍需要麦克风权限<br>
                                • 这是浏览器安全策略，无法绕过<br>
                                • 服务器端处理是唯一可行的解决方案
                            </p>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #28a745; margin-bottom: 12px;">🛠️ 技术实现方案</h4>
                        <div style="background: #f8f9fa; padding: 12px; border-radius: 6px;">
                            <h5 style="margin: 0 0 8px 0; color: #333;">方案1: FFmpeg + Whisper（推荐）</h5>
                            <pre style="background: #2d3748; color: #e2e8f0; padding: 12px; border-radius: 4px; font-size: 12px; overflow-x: auto; margin: 8px 0;">
<code>// 1. 安装依赖
npm install fluent-ffmpeg whisper-node

// 2. 音频提取
ffmpeg(videoPath)
    .audioCodec('pcm_s16le')
    .audioFrequency(16000)
    .audioChannels(1)
    .format('wav')
    .on('end', () => {
        // 3. 语音识别
        whisper.transcribe(audioPath, { language: 'zh' })
            .then(result => {
                res.json({ text: result.text });
            });
    });</code></pre>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #ff6b6b; margin-bottom: 12px;">🌐 在线API服务方案</h4>
                        <div style="background: #f8f9fa; padding: 12px; border-radius: 6px;">
                            <h5 style="margin: 0 0 8px 0; color: #333;">方案2: Google Cloud Speech-to-Text</h5>
                            <pre style="background: #2d3748; color: #e2e8f0; padding: 12px; border-radius: 4px; font-size: 12px; overflow-x: auto; margin: 8px 0;">
<code>const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient();

const audio = {
    content: audioBuffer.toString('base64')
};

const config = {
    encoding: 'LINEAR16',
    sampleRateHertz: 16000,
    languageCode: 'zh-CN'
};

client.recognize({ audio, config })
    .then(response => {
        const transcription = response[0].results[0].alternatives[0].transcript;
        res.json({ text: transcription });
    });</code></pre>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #6f42c1; margin-bottom: 12px;">📋 实现步骤</h4>
                        <div style="background: #f8f9fa; padding: 12px; border-radius: 6px;">
                            <ol style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                                <li><strong>前端上传</strong>: 用户上传视频文件到服务器</li>
                                <li><strong>音频提取</strong>: 服务器使用FFmpeg从视频中提取音频</li>
                                <li><strong>语音识别</strong>: 使用Whisper或API服务进行语音识别</li>
                                <li><strong>返回结果</strong>: 将识别结果返回给前端显示</li>
                            </ol>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #fd7e14; margin-bottom: 12px;">✅ 优势对比</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div style="background: #fff3cd; padding: 12px; border-radius: 6px; border: 1px solid #ffeaa7;">
                                <h5 style="margin: 0 0 8px 0; color: #856404;">❌ 当前方案（Web Speech API）</h5>
                                <ul style="margin: 0; padding-left: 16px; font-size: 13px;">
                                    <li>需要麦克风权限</li>
                                    <li>浏览器兼容性问题</li>
                                    <li>识别准确率有限</li>
                                    <li>依赖浏览器API</li>
                                </ul>
                            </div>
                            <div style="background: #d4edda; padding: 12px; border-radius: 6px; border: 1px solid #c3e6cb;">
                                <h5 style="margin: 0 0 8px 0; color: #155724;">✅ 服务器端方案</h5>
                                <ul style="margin: 0; padding-left: 16px; font-size: 13px;">
                                    <li>无需麦克风权限</li>
                                    <li>跨浏览器兼容</li>
                                    <li>专业级识别准确率</li>
                                    <li>稳定可靠</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div style="text-align: center; margin-top: 20px;">
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" style="padding: 12px 24px; background: #007AFF; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
                            明白了，关闭
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    setupSystemAudioRecording(modal, language, file) {
        const startRecordingBtn = modal.querySelector('#startRecordingBtn');
        const stopRecordingBtn = modal.querySelector('#stopRecordingBtn');
        const startRecognitionBtn = modal.querySelector('#startRecognitionBtn');
        const statusText = modal.querySelector('.status-text');
        const resultText = modal.querySelector('.result-text');
        
        let mediaRecorder = null;
        let audioChunks = [];
        let recognition = null;
        let finalText = '';
        
        startRecordingBtn.onclick = async () => {
            try {
                statusText.textContent = '正在从视频文件提取音频...';
                startRecordingBtn.disabled = true;
                stopRecordingBtn.disabled = false;

                // 直接从上传的视频文件提取音频
                await this.extractAudioFromVideo(file, language, resultText);

            } catch (error) {
                console.error('❌ 音频提取失败:', error);
                
                let errorMessage = '';
                let alertMessage = '';
                
                if (error.name === 'NotSupportedError') {
                    errorMessage = '浏览器不支持音频提取功能';
                    alertMessage = '浏览器不支持音频提取功能！\n\n建议使用麦克风录制或在线工具';
                } else if (error.message.includes('音频轨道')) {
                    errorMessage = '视频文件中没有音频轨道';
                    alertMessage = '视频文件中没有音频轨道！\n\n请确保：\n1. 视频文件包含音频\n2. 文件格式支持音频提取\n3. 或者使用麦克风录制方式';
                } else {
                    errorMessage = `音频提取失败: ${error.message}`;
                    alertMessage = `音频提取失败: ${error.message}\n\n建议使用麦克风录制或在线工具`;
                }

                statusText.textContent = errorMessage;
                alert(alertMessage);

                // 显示详细的解决方案
                resultText.innerHTML = `
                    <div style="color: #ff6b6b; font-weight: 600; margin-bottom: 12px;">
                        ⚠️ ${errorMessage}
                    </div>
                    <div style="background: #fff3cd; padding: 12px; border-radius: 6px; border: 1px solid #ffeaa7;">
                        <strong>解决方案:</strong>
                        <ol style="margin: 8px 0 0 20px; font-size: 14px;">
                            <li><strong>确保视频文件包含音频轨道</strong></li>
                            <li>检查视频文件格式是否支持音频提取</li>
                            <li>尝试使用"麦克风录制"方式</li>
                            <li>或者使用"在线工具"进行转换</li>
                        </ol>
                    </div>
                    <div style="margin-top: 12px;">
                        <button onclick="location.reload()" style="padding: 8px 16px; background: #007AFF; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 8px;">
                            重新开始
                        </button>
                        <button onclick="document.querySelector('.modal').remove()" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            关闭
                        </button>
                    </div>
                `;
            }
        };
        
        stopRecordingBtn.onclick = () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                console.log('⏹️ 停止录制');
            }
        };
        
        startRecognitionBtn.onclick = async () => {
            try {
                // 检查浏览器支持
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (!SpeechRecognition) {
                    alert('浏览器不支持语音识别功能，请使用Chrome、Edge或Safari浏览器');
                    return;
                }
                
                recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = language;
                
                recognition.onstart = () => {
                    statusText.textContent = '正在识别录制的音频...';
                    startRecognitionBtn.innerHTML = '识别中...';
                    startRecognitionBtn.disabled = true;
                    console.log('🎤 开始识别录制的音频');
                };
                
                recognition.onresult = (event) => {
                    let currentFinal = '';
                    let currentInterim = '';
                    
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            currentFinal += transcript;
                        } else {
                            currentInterim += transcript;
                        }
                    }
                    
                    finalText += currentFinal;
                    resultText.innerHTML = `
                        <div style="margin-bottom: 12px;">
                            <strong>识别结果:</strong>
                        </div>
                        <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #ddd;">
                            ${finalText + currentInterim}
                        </div>
                    `;
                    console.log('📝 识别结果:', finalText + currentInterim);
                };
                
                recognition.onerror = (event) => {
                    console.error('❌ 语音识别错误:', event.error);
                    statusText.textContent = `识别失败: ${event.error}`;
                    startRecognitionBtn.innerHTML = '重新识别';
                    startRecognitionBtn.disabled = false;
                };
                
                recognition.onend = () => {
                    statusText.textContent = '识别完成';
                    startRecognitionBtn.innerHTML = '重新识别';
                    startRecognitionBtn.disabled = false;
                    console.log('🎤 语音识别结束');
                    
                    if (finalText.trim()) {
                        // 更新视频内容
                        this.videoContent.value = finalText.trim();
                        
                        // 显示结果
                        this.showVideoToTextResult(finalText.trim());
                    } else {
                        statusText.textContent = '未识别到语音内容，请重试';
                    }
                };
                
                recognition.start();
                
            } catch (error) {
                console.error('❌ 语音识别失败:', error);
                statusText.textContent = `识别失败: ${error.message}`;
                startRecognitionBtn.innerHTML = '重新识别';
                startRecognitionBtn.disabled = false;
            }
        };
    }

    showBrowserRecognitionModal(file, language) {
        const modal = this.createInfoModal();
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🎤 浏览器语音识别</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="video-player" style="margin-bottom: 20px;">
                        <video id="videoPlayer" controls style="width: 100%; border-radius: 8px;">
                            <source src="${URL.createObjectURL(file)}" type="${file.type}">
                            您的浏览器不支持视频播放
                        </video>
                    </div>
                    
                    <div class="recognition-status" style="text-align: center; margin: 20px 0;">
                        <div class="status-icon" style="font-size: 48px; margin-bottom: 16px;">🎤</div>
                        <div class="status-text" style="font-size: 16px; color: #007AFF;">请播放视频，系统将自动识别语音</div>
                    </div>
                    
                    <div class="recognition-result" style="background: #f5f5f5; padding: 16px; border-radius: 8px; min-height: 100px; max-height: 200px; overflow-y: auto;">
                        <div class="result-text" style="font-size: 14px; line-height: 1.6; color: #333;"></div>
                    </div>
                    
                    <div class="recognition-tips" style="margin-top: 16px; padding: 12px; background: rgba(0, 122, 255, 0.1); border-radius: 8px;">
                        <strong>💡 使用提示:</strong>
                        <ul style="margin: 8px 0 0 20px; font-size: 14px;">
                            <li><strong>重要:</strong> 点击"开始识别"前，请先允许麦克风权限</li>
                            <li>播放视频时请调大音量，确保有声音输出</li>
                            <li>识别结果会实时显示在下方文本框中</li>
                            <li>建议在安静环境中使用，避免背景噪音</li>
                            <li>如果识别失败，请检查麦克风权限设置</li>
                        </ul>
                    </div>
                    
                    <div class="action-buttons" style="margin-top: 20px; display: flex; gap: 12px;">
                        <button id="startRecognitionBtn" class="btn btn-primary" style="flex: 1; padding: 12px; background: #007AFF; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                            开始识别
                        </button>
                        <button class="btn btn-secondary" onclick="document.querySelector('.modal').remove()" style="padding: 12px 20px; background: #f0f0f0; color: #333; border: none; border-radius: 8px; cursor: pointer;">
                            关闭
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加关闭事件
        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.onclick = () => modal.remove();
        }
        
        // 设置语音识别
        this.setupBrowserRecognition(modal, language);
        
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 100);
    }

    setupBrowserRecognition(modal, language) {
        const startBtn = modal.querySelector('#startRecognitionBtn');
        const statusText = modal.querySelector('.status-text');
        const resultText = modal.querySelector('.result-text');
        
        let recognition = null;
        let finalText = '';
        
        startBtn.onclick = async () => {
            // 检查浏览器支持
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                alert('浏览器不支持语音识别功能，请使用Chrome、Edge或Safari浏览器');
                return;
            }
            
            // 检查麦克风设备和权限
            try {
                // 首先检查是否有可用的音频设备
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioInputs = devices.filter(device => device.kind === 'audioinput');
                
                if (audioInputs.length === 0) {
                    throw new Error('NO_AUDIO_DEVICE');
                }
                
                console.log('🎤 找到音频设备:', audioInputs.length, '个');
                
                // 尝试获取麦克风权限
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
                stream.getTracks().forEach(track => track.stop());
                console.log('✅ 麦克风权限已获得');
                
            } catch (error) {
                console.error('❌ 麦克风检查失败:', error);
                
                let errorMessage = '';
                let alertMessage = '';
                
                if (error.name === 'NotFoundError' || error.message === 'NO_AUDIO_DEVICE') {
                    errorMessage = '未找到麦克风设备，请检查麦克风连接';
                    alertMessage = '未检测到麦克风设备！\n\n请检查：\n1. 麦克风是否正确连接\n2. 系统音频设置中是否启用了麦克风\n3. 其他应用是否能正常使用麦克风';
                } else if (error.name === 'NotAllowedError') {
                    errorMessage = '麦克风权限被拒绝，请允许麦克风权限';
                    alertMessage = '需要麦克风权限才能进行语音识别！\n\n请点击浏览器地址栏的麦克风图标，选择"允许"';
                } else if (error.name === 'NotReadableError') {
                    errorMessage = '麦克风被其他应用占用，请关闭其他应用后重试';
                    alertMessage = '麦克风被其他应用占用！\n\n请关闭其他使用麦克风的应用（如视频会议、录音软件等）后重试';
                } else {
                    errorMessage = `麦克风错误: ${error.message}`;
                    alertMessage = `麦克风错误: ${error.message}\n\n建议使用在线工具进行视频转文字`;
                }
                
                statusText.textContent = errorMessage;
                alert(alertMessage);
                return;
            }
            
            recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = language;
            
            recognition.onstart = () => {
                statusText.textContent = '正在识别语音...';
                startBtn.innerHTML = '识别中...';
                startBtn.disabled = true;
                console.log('🎤 语音识别开始');
            };
            
            recognition.onresult = (event) => {
                let currentFinal = '';
                let currentInterim = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        currentFinal += transcript;
                    } else {
                        currentInterim += transcript;
                    }
                }
                
                finalText += currentFinal;
                resultText.textContent = finalText + currentInterim;
                console.log('📝 识别结果:', finalText + currentInterim);
            };
            
            recognition.onerror = (event) => {
                console.error('❌ 语音识别错误:', event.error);
                
                let errorMessage = '';
                switch (event.error) {
                    case 'not-allowed':
                        errorMessage = '麦克风权限被拒绝，请允许麦克风权限';
                        break;
                    case 'no-speech':
                        errorMessage = '未检测到语音，请确保视频有声音';
                        break;
                    case 'audio-capture':
                        errorMessage = '音频捕获失败，请检查麦克风设备';
                        break;
                    case 'network':
                        errorMessage = '网络错误，请检查网络连接';
                        break;
                    default:
                        errorMessage = `识别失败: ${event.error}`;
                }
                
                statusText.textContent = errorMessage;
                startBtn.innerHTML = '重新识别';
                startBtn.disabled = false;
                
                // 显示详细错误信息
                this.showVideoToTextError(errorMessage);
            };
            
            recognition.onend = () => {
                statusText.textContent = '识别完成';
                startBtn.innerHTML = '重新识别';
                startBtn.disabled = false;
                console.log('🎤 语音识别结束');
                
                if (finalText.trim()) {
                    // 更新视频内容
                    this.videoContent.value = finalText.trim();
                    
                    // 显示结果
                    this.showVideoToTextResult(finalText.trim());
                } else {
                    statusText.textContent = '未识别到语音内容，请确保视频有声音并重试';
                }
            };
            
            try {
                recognition.start();
            } catch (error) {
                console.error('❌ 启动语音识别失败:', error);
                statusText.textContent = '启动语音识别失败，请重试';
                startBtn.innerHTML = '重新识别';
                startBtn.disabled = false;
            }
        };
    }

    showOnlineToolsModal(file) {
        const modal = this.createInfoModal();
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🌐 推荐在线工具</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="file-info" style="margin-bottom: 20px; padding: 12px; background: #f5f5f5; border-radius: 8px;">
                        <div style="font-weight: 600; margin-bottom: 4px;">${file.name}</div>
                        <div style="font-size: 14px; color: #666;">大小: ${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                    
                    <div class="tools-list">
                        <div class="tool-item" style="margin-bottom: 16px; padding: 16px; border: 1px solid #ddd; border-radius: 8px;">
                            <h4 style="margin: 0 0 8px 0; color: #007AFF;">📝 Kapwing</h4>
                            <p style="margin: 0 0 12px 0; font-size: 14px; color: #666;">
                                支持100+语言，免费版有限制，准确度高
                            </p>
                            <a href="https://www.kapwing.com/tools/transcribe" target="_blank" class="btn btn-primary" style="display: inline-block; padding: 8px 16px; background: #007AFF; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">
                                打开 Kapwing
                            </a>
                        </div>
                        
                        <div class="tool-item" style="margin-bottom: 16px; padding: 16px; border: 1px solid #ddd; border-radius: 8px;">
                            <h4 style="margin: 0 0 8px 0; color: #007AFF;">🎤 Dictationer</h4>
                            <p style="margin: 0 0 12px 0; font-size: 14px; color: #666;">
                                完全免费，支持多语言翻译，高精度识别
                            </p>
                            <a href="https://www.dictationer.com/zh/upload-file/video-to-text" target="_blank" class="btn btn-primary" style="display: inline-block; padding: 8px 16px; background: #007AFF; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">
                                打开 Dictationer
                            </a>
                        </div>
                        
                        <div class="tool-item" style="margin-bottom: 16px; padding: 16px; border: 1px solid #ddd; border-radius: 8px;">
                            <h4 style="margin: 0 0 8px 0; color: #007AFF;">🎬 Clideo</h4>
                            <p style="margin: 0 0 12px 0; font-size: 14px; color: #666;">
                                免费，支持多种视频格式，操作简单
                            </p>
                            <a href="https://www.clideo.com/video-to-text" target="_blank" class="btn btn-primary" style="display: inline-block; padding: 8px 16px; background: #007AFF; color: white; text-decoration: none; border-radius: 6px; font-size: 14px;">
                                打开 Clideo
                            </a>
                        </div>
                    </div>
                    
                    <div class="tips" style="margin-top: 20px; padding: 12px; background: rgba(0, 122, 255, 0.1); border-radius: 8px;">
                        <strong>💡 使用提示:</strong>
                        <ul style="margin: 8px 0 0 20px; font-size: 14px;">
                            <li>上传视频文件到在线工具</li>
                            <li>选择相应的识别语言</li>
                            <li>等待处理完成后下载文本</li>
                            <li>将文本复制到视频文案框中</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加关闭事件
        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.onclick = () => modal.remove();
        }
        
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 100);
    }

    showVideoToTextResult(text) {
        const modal = this.createInfoModal();
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>✅ 视频转文字成功</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="content-section">
                        <h4>📝 识别结果</h4>
                        <textarea readonly style="width: 100%; height: 200px; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; line-height: 1.5;">${text}</textarea>
                    </div>
                    
                    <div class="action-buttons" style="margin-top: 20px; display: flex; gap: 10px;">
                        <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${text.replace(/'/g, "\\'")}'); alert('文本已复制到剪贴板！')">复制文本</button>
                        <button class="btn btn-secondary" onclick="document.querySelector('.modal').remove()">关闭</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加关闭事件
        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.onclick = () => modal.remove();
        }
        
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 100);
    }

    showVideoToTextError(error) {
        const modal = this.createInfoModal();
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>❌ 视频转文字失败</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="error-info">
                        <p><strong>错误原因:</strong> ${error}</p>
                        <p><strong>解决建议:</strong></p>
                        <ul>
                            <li>确保使用Chrome、Edge或Safari浏览器</li>
                            <li>检查麦克风权限是否已开启</li>
                            <li>确保网络连接正常</li>
                            <li>尝试使用推荐的在线工具</li>
                            <li>检查视频文件格式是否支持</li>
                        </ul>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="this.parentElement.parentElement.parentElement.remove()">我知道了</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 添加关闭事件
        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.onclick = () => modal.remove();
        }
        
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 100);
    }

    showNoVideoUrlMessage() {
        const modal = this.createInfoModal();
        document.body.appendChild(modal);

        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);

        setTimeout(() => {
            modal.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(modal);
            }, 300);
        }, 5000);
    }

    createInfoModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 24px;
            border-radius: 12px;
            z-index: 1000;
            max-width: 400px;
            opacity: 0;
            transition: opacity 0.3s ease;
            backdrop-filter: blur(10px);
        `;

        modal.innerHTML = `
            <h3 style="margin: 0 0 16px 0; color: #ff9500;">📹 无法获取下载链接</h3>
            <p style="margin: 0 0 16px 0; line-height: 1.6;">
                由于以下原因无法获取视频下载地址：<br>
                • 抖音反爬机制限制<br>
                • 视频需要登录才能访问<br>
                • 视频可能已被删除或设为私密<br>
            </p>
            <div style="background: rgba(255, 149, 0, 0.1); padding: 12px; border-radius: 8px; border: 1px solid rgba(255, 149, 0, 0.3);">
                <strong>💡 建议替代方案：</strong><br>
                1. 在抖音APP中直接保存视频<br>
                2. 使用抖音官方的分享功能<br>
                3. 尝试专业的视频下载工具<br>
                4. 手动录制屏幕保存内容
            </div>
        `;

        return modal;
    }

    formatNumber(num) {
        if (num >= 10000) {
            return (num / 10000).toFixed(1) + '万';
        }
        return num.toString();
    }

    exportContent() {
        // 收集所有视频信息
        const videoData = {
            title: this.videoTitle.textContent,
            author: this.authorName.textContent,
            description: this.videoContent.value,
            publishTime: this.publishTime.textContent,
            likeCount: this.likeCount.textContent,
            commentCount: this.commentCount.textContent,
            shareCount: this.shareCount.textContent,
            videoId: this.videoId.textContent,
            videoUrl: this.downloadLink.href !== '#' ? this.downloadLink.href : '无下载链接'
        };

        // 检查是否有内容可导出
        if (!videoData.title && !videoData.description && !videoData.author) {
            this.showError('没有可导出的内容');
            return;
        }

        try {
            // 生成导出内容
            const exportContent = this.generateExportContent(videoData);
            
            const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `抖音视频信息_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showSuccessMessage('视频信息导出成功！');
        } catch (error) {
            console.error('导出失败:', error);
            this.showError('导出失败，请重试');
        }
    }

    generateExportContent(videoData) {
        const timestamp = new Date().toLocaleString('zh-CN');
        
        return `抖音视频信息导出
导出时间: ${timestamp}
========================================

视频标题: ${videoData.title}
视频作者: ${videoData.author}
发布时间: ${videoData.publishTime}
视频ID: ${videoData.videoId}

视频简介:
${videoData.description}

统计数据:
- 点赞数: ${videoData.likeCount}
- 评论数: ${videoData.commentCount}
- 分享数: ${videoData.shareCount}

下载信息:
视频地址（无水印）: ${videoData.videoUrl}

========================================
导出说明: 此文件由抖音视频信息提取器自动生成
工具地址: ${window.location.href}
`;
    }

    showSuccessMessage(message) {
        const originalText = this.exportBtn.textContent;
        this.exportBtn.textContent = message;
        this.exportBtn.style.background = '#34c759';

        setTimeout(() => {
            this.exportBtn.textContent = originalText;
            this.exportBtn.style.background = '';
        }, 2000);
    }

    setLoading(isLoading) {
        this.fetchBtn.disabled = isLoading;

        if (isLoading) {
            this.btnText.style.display = 'none';
            this.loadingContainer.classList.remove('hidden');
        } else {
            this.btnText.style.display = 'inline';
            this.loadingContainer.classList.add('hidden');
        }
    }

    hideAllSections() {
        this.videoInfo.classList.add('hidden');
        this.contentSection.classList.add('hidden');
        this.downloadSection.classList.add('hidden');
        this.errorMessage.classList.add('hidden');
    }

    showSection(section) {
        section.classList.remove('hidden');
        section.style.animation = 'cardFadeIn 0.6s ease-out';
    }

    showError(message) {
        this.hideAllSections();
        this.errorText.textContent = message;
        this.showSection(this.errorMessage);

        setTimeout(() => {
            this.errorMessage.classList.add('hidden');
        }, 5000);
    }
}

class VideoToTextAPI {
    constructor() {
        this.apiEndpoints = [
            'https://api.example.com/speech-to-text',
            'https://api.openai.com/v1/audio/transcriptions'
        ];
    }

    async transcribeVideo(videoUrl) {
        try {
            const audioUrl = await this.extractAudioFromVideo(videoUrl);
            const transcription = await this.callTranscriptionAPI(audioUrl);
            return transcription;
        } catch (error) {
            console.error('视频转文字失败:', error);
            throw error;
        }
    }

    async extractAudioFromVideo(videoUrl) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve('mock_audio_url.mp3');
            }, 1000);
        });
    }

    async callTranscriptionAPI(audioUrl) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve('这是通过语音识别提取的文字内容示例。实际使用时需要配置真实的语音转文字API服务。');
            }, 2000);
        });
    }
}

class DouyinAPIService {
    constructor() {
        this.baseUrl = 'https://api.douyin.com';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
            'Accept': 'application/json'
        };
    }

    async getVideoInfo(videoId) {
        try {
            const response = await fetch(`${this.baseUrl}/aweme/v1/feed/?aweme_id=${videoId}`, {
                headers: this.headers,
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error('API响应错误');
            }

            const data = await response.json();
            return this.parseVideoData(data);
        } catch (error) {
            console.warn('直接API调用失败，使用模拟数据:', error);
            return this.getMockVideoData();
        }
    }

    parseVideoData(apiData) {
        try {
            const aweme = apiData.aweme_list[0];
            return {
                author: aweme.author.nickname,
                publishTime: new Date(aweme.create_time * 1000).toLocaleDateString('zh-CN'),
                likeCount: aweme.statistics.digg_count,
                description: aweme.desc,
                videoUrl: aweme.video.play_addr.url_list[0],
                musicTitle: aweme.music.title
            };
        } catch (error) {
            throw new Error('解析API数据失败');
        }
    }

    getMockVideoData() {
        return {
            author: '抖音用户' + Math.floor(Math.random() * 10000),
            publishTime: new Date().toLocaleDateString('zh-CN'),
            likeCount: Math.floor(Math.random() * 100000) + 1000,
            description: '这是一个示例视频描述。\n\n#抖音 #视频 #分享\n\n由于抖音的API限制，这里显示的是模拟数据。实际部署时，您需要：\n\n1. 使用服务器端代理来绕过CORS限制\n2. 获取抖音官方API权限\n3. 或使用第三方视频解析服务',
            videoUrl: 'https://example.com/sample_video.mp4',
            musicTitle: '原创音乐'
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new DouyinVideoExtractor();

    const urlParams = new URLSearchParams(window.location.search);
    const shareUrl = urlParams.get('url');
    if (shareUrl) {
        document.getElementById('urlInput').value = decodeURIComponent(shareUrl);
    }
});

window.addEventListener('beforeunload', (e) => {
    const urlInput = document.getElementById('urlInput');
    if (urlInput && urlInput.value.trim()) {
        localStorage.setItem('douyin_last_url', urlInput.value);
    }
});

window.addEventListener('load', () => {
    const lastUrl = localStorage.getItem('douyin_last_url');
    const urlInput = document.getElementById('urlInput');
    if (lastUrl && urlInput && !urlInput.value) {
        urlInput.value = lastUrl;
    }
});