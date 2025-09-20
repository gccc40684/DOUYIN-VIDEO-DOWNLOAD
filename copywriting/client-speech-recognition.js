// 客户端语音识别功能
class ClientSpeechRecognition {
    constructor() {
        this.recognition = null;
        this.isSupported = this.checkSupport();
        this.isRecording = false;
        this.onResult = null;
        this.onError = null;
    }

    /**
     * 检查浏览器支持
     * @returns {boolean} 是否支持
     */
    checkSupport() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        return !!SpeechRecognition;
    }

    /**
     * 初始化语音识别
     * @param {Object} options - 配置选项
     */
    init(options = {}) {
        if (!this.isSupported) {
            throw new Error('浏览器不支持语音识别功能');
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        // 配置选项
        this.recognition.continuous = options.continuous || true;
        this.recognition.interimResults = options.interimResults || true;
        this.recognition.lang = options.language || 'zh-CN';
        this.recognition.maxAlternatives = options.maxAlternatives || 1;

        // 事件监听
        this.recognition.onstart = () => {
            console.log('🎤 语音识别开始');
            this.isRecording = true;
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            if (this.onResult) {
                this.onResult({
                    final: finalTranscript,
                    interim: interimTranscript,
                    confidence: event.results[event.resultIndex][0].confidence
                });
            }
        };

        this.recognition.onerror = (event) => {
            console.error('❌ 语音识别错误:', event.error);
            this.isRecording = false;
            if (this.onError) {
                this.onError(event.error);
            }
        };

        this.recognition.onend = () => {
            console.log('🎤 语音识别结束');
            this.isRecording = false;
        };
    }

    /**
     * 开始语音识别
     * @param {Function} onResult - 结果回调
     * @param {Function} onError - 错误回调
     */
    start(onResult, onError) {
        if (!this.recognition) {
            this.init();
        }

        this.onResult = onResult;
        this.onError = onError;

        try {
            this.recognition.start();
        } catch (error) {
            console.error('❌ 启动语音识别失败:', error);
            if (onError) {
                onError(error.message);
            }
        }
    }

    /**
     * 停止语音识别
     */
    stop() {
        if (this.recognition && this.isRecording) {
            this.recognition.stop();
        }
    }

    /**
     * 暂停语音识别
     */
    pause() {
        if (this.recognition && this.isRecording) {
            this.recognition.stop();
        }
    }

    /**
     * 恢复语音识别
     */
    resume() {
        if (this.recognition && !this.isRecording) {
            this.recognition.start();
        }
    }

    /**
     * 获取支持的语言列表
     * @returns {Array} 语言列表
     */
    getSupportedLanguages() {
        return [
            { code: 'zh-CN', name: '中文（简体）' },
            { code: 'zh-TW', name: '中文（繁体）' },
            { code: 'en-US', name: '英语（美国）' },
            { code: 'en-GB', name: '英语（英国）' },
            { code: 'ja-JP', name: '日语' },
            { code: 'ko-KR', name: '韩语' },
            { code: 'fr-FR', name: '法语' },
            { code: 'de-DE', name: '德语' },
            { code: 'es-ES', name: '西班牙语' },
            { code: 'it-IT', name: '意大利语' },
            { code: 'pt-BR', name: '葡萄牙语（巴西）' },
            { code: 'ru-RU', name: '俄语' }
        ];
    }

    /**
     * 检查麦克风权限
     * @returns {Promise<boolean>} 是否有权限
     */
    async checkMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('❌ 麦克风权限检查失败:', error);
            return false;
        }
    }

    /**
     * 请求麦克风权限
     * @returns {Promise<boolean>} 是否获得权限
     */
    async requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('❌ 麦克风权限请求失败:', error);
            return false;
        }
    }
}

// 视频语音转文字工具类
class VideoSpeechToTextTool {
    constructor() {
        this.speechRecognition = new ClientSpeechRecognition();
        this.audioContext = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
    }

    /**
     * 从视频URL提取音频并转换为文字
     * @param {string} videoUrl - 视频URL
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 转换结果
     */
    async convertVideoToText(videoUrl, options = {}) {
        console.log('🎤 开始视频语音转文字...');

        try {
            // 步骤1: 检查浏览器支持
            if (!this.speechRecognition.isSupported) {
                throw new Error('浏览器不支持语音识别功能');
            }

            // 步骤2: 检查麦克风权限
            const hasPermission = await this.speechRecognition.checkMicrophonePermission();
            if (!hasPermission) {
                const granted = await this.speechRecognition.requestMicrophonePermission();
                if (!granted) {
                    throw new Error('需要麦克风权限才能进行语音识别');
                }
            }

            // 步骤3: 创建音频元素
            const audio = new Audio(videoUrl);
            audio.crossOrigin = 'anonymous';

            // 步骤4: 设置音频上下文
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaElementSource(audio);
            const analyser = this.audioContext.createAnalyser();
            source.connect(analyser);
            analyser.connect(this.audioContext.destination);

            // 步骤5: 开始语音识别
            return new Promise((resolve, reject) => {
                let finalText = '';
                let interimText = '';

                this.speechRecognition.start(
                    (result) => {
                        finalText = result.final;
                        interimText = result.interim;
                        
                        // 实时更新结果
                        if (options.onProgress) {
                            options.onProgress({
                                final: finalText,
                                interim: interimText,
                                confidence: result.confidence
                            });
                        }
                    },
                    (error) => {
                        reject(new Error(`语音识别失败: ${error}`));
                    }
                );

                // 播放音频
                audio.play();

                // 监听音频结束
                audio.onended = () => {
                    this.speechRecognition.stop();
                    resolve({
                        success: true,
                        text: finalText || interimText,
                        confidence: 0.8,
                        duration: audio.duration,
                        language: options.language || 'zh-CN',
                        method: 'browser-speech-recognition'
                    });
                };

                // 监听音频错误
                audio.onerror = (error) => {
                    reject(new Error(`音频播放失败: ${error.message}`));
                };
            });

        } catch (error) {
            console.error('❌ 视频转文字失败:', error.message);
            return {
                success: false,
                error: error.message,
                suggestion: this.getErrorSuggestion(error.message)
            };
        }
    }

    /**
     * 实时语音识别
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 识别结果
     */
    async startRealTimeRecognition(options = {}) {
        console.log('🎤 开始实时语音识别...');

        try {
            if (!this.speechRecognition.isSupported) {
                throw new Error('浏览器不支持语音识别功能');
            }

            const hasPermission = await this.speechRecognition.checkMicrophonePermission();
            if (!hasPermission) {
                const granted = await this.speechRecognition.requestMicrophonePermission();
                if (!granted) {
                    throw new Error('需要麦克风权限才能进行语音识别');
                }
            }

            return new Promise((resolve, reject) => {
                let finalText = '';
                let interimText = '';

                this.speechRecognition.start(
                    (result) => {
                        finalText = result.final;
                        interimText = result.interim;
                        
                        if (options.onResult) {
                            options.onResult({
                                final: finalText,
                                interim: interimText,
                                confidence: result.confidence
                            });
                        }
                    },
                    (error) => {
                        reject(new Error(`语音识别失败: ${error}`));
                    }
                );

                // 设置超时
                if (options.timeout) {
                    setTimeout(() => {
                        this.speechRecognition.stop();
                        resolve({
                            success: true,
                            text: finalText || interimText,
                            confidence: 0.8,
                            duration: options.timeout / 1000,
                            language: options.language || 'zh-CN',
                            method: 'real-time-speech-recognition'
                        });
                    }, options.timeout);
                }
            });

        } catch (error) {
            console.error('❌ 实时语音识别失败:', error.message);
            return {
                success: false,
                error: error.message,
                suggestion: this.getErrorSuggestion(error.message)
            };
        }
    }

    /**
     * 停止语音识别
     */
    stop() {
        this.speechRecognition.stop();
    }

    /**
     * 获取错误建议
     * @param {string} error - 错误信息
     * @returns {string} 建议
     */
    getErrorSuggestion(error) {
        if (error.includes('不支持')) {
            return '请使用Chrome、Edge或Safari浏览器';
        } else if (error.includes('权限')) {
            return '请在浏览器设置中允许麦克风权限';
        } else if (error.includes('网络')) {
            return '请检查网络连接';
        } else {
            return '建议使用在线工具如Kapwing或Dictationer';
        }
    }

    /**
     * 获取支持的语言
     * @returns {Array} 语言列表
     */
    getSupportedLanguages() {
        return this.speechRecognition.getSupportedLanguages();
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ClientSpeechRecognition, VideoSpeechToTextTool };
} else {
    window.ClientSpeechRecognition = ClientSpeechRecognition;
    window.VideoSpeechToTextTool = VideoSpeechToTextTool;
}
