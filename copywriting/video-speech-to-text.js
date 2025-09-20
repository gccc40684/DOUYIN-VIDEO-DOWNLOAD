// 视频语音转文字功能
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class VideoSpeechToText {
    constructor() {
        this.supportedServices = [
            {
                name: 'Whisper-API',
                endpoint: 'https://api.openai.com/v1/audio/transcriptions',
                requiresKey: true,
                cost: 'paid'
            },
            {
                name: 'AssemblyAI',
                endpoint: 'https://api.assemblyai.com/v2/transcript',
                requiresKey: true,
                cost: 'free-tier'
            },
            {
                name: 'RevAI',
                endpoint: 'https://api.rev.ai/speechtotext/v1/jobs',
                requiresKey: true,
                cost: 'free-tier'
            }
        ];
        
        this.freeServices = [
            {
                name: 'Web Speech API',
                type: 'browser-native',
                description: '浏览器原生语音识别'
            },
            {
                name: 'SpeechRecognition.js',
                type: 'client-side',
                description: '客户端语音识别库'
            }
        ];
    }

    /**
     * 提取视频音频并转换为文字
     * @param {string} videoUrl - 视频URL
     * @param {Object} options - 选项
     * @returns {Object} 转换结果
     */
    async convertVideoToText(videoUrl, options = {}) {
        console.log('🎤 开始视频语音转文字...');
        
        try {
            // 步骤1: 提取音频
            const audioData = await this.extractAudioFromVideo(videoUrl);
            if (!audioData) {
                throw new Error('无法提取视频音频');
            }

            // 步骤2: 转换为文字
            const textResult = await this.speechToText(audioData, options);
            
            return {
                success: true,
                text: textResult.text,
                confidence: textResult.confidence,
                duration: textResult.duration,
                language: textResult.language,
                method: textResult.method
            };

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
     * 从视频中提取音频
     * @param {string} videoUrl - 视频URL
     * @returns {Buffer} 音频数据
     */
    async extractAudioFromVideo(videoUrl) {
        console.log('🎵 提取视频音频...');
        
        try {
            // 使用ffmpeg提取音频（需要系统安装ffmpeg）
            const { exec } = require('child_process');
            const util = require('util');
            const execAsync = util.promisify(exec);
            
            const tempAudioFile = path.join(__dirname, 'temp_audio.wav');
            
            // 提取音频命令
            const command = `ffmpeg -i "${videoUrl}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${tempAudioFile}" -y`;
            
            await execAsync(command);
            
            // 读取音频文件
            const audioData = fs.readFileSync(tempAudioFile);
            
            // 清理临时文件
            fs.unlinkSync(tempAudioFile);
            
            console.log('✅ 音频提取成功');
            return audioData;

        } catch (error) {
            console.log('⚠️ FFmpeg提取失败，尝试其他方法:', error.message);
            
            // 备用方案：直接下载视频文件
            try {
                const response = await axios.get(videoUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
                    }
                });
                
                console.log('✅ 视频下载成功');
                return Buffer.from(response.data);
                
            } catch (downloadError) {
                console.error('❌ 视频下载失败:', downloadError.message);
                throw new Error('无法获取视频数据');
            }
        }
    }

    /**
     * 语音转文字
     * @param {Buffer} audioData - 音频数据
     * @param {Object} options - 选项
     * @returns {Object} 转换结果
     */
    async speechToText(audioData, options = {}) {
        console.log('🗣️ 开始语音识别...');
        
        // 尝试免费方案
        const freeResult = await this.tryFreeSpeechRecognition(audioData, options);
        if (freeResult.success) {
            return freeResult;
        }
        
        // 尝试付费API（如果有API Key）
        const apiResult = await this.tryPaidSpeechRecognition(audioData, options);
        if (apiResult.success) {
            return apiResult;
        }
        
        throw new Error('所有语音识别方案都失败了');
    }

    /**
     * 尝试免费语音识别
     * @param {Buffer} audioData - 音频数据
     * @param {Object} options - 选项
     * @returns {Object} 识别结果
     */
    async tryFreeSpeechRecognition(audioData, options) {
        console.log('🆓 尝试免费语音识别方案...');
        
        try {
            // 方案1: 使用Web Speech API（需要浏览器环境）
            if (options.useBrowserAPI) {
                return await this.useWebSpeechAPI(audioData);
            }
            
            // 方案2: 使用本地语音识别库
            return await this.useLocalSpeechRecognition(audioData);
            
        } catch (error) {
            console.log('⚠️ 免费方案失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 使用Web Speech API
     * @param {Buffer} audioData - 音频数据
     * @returns {Object} 识别结果
     */
    async useWebSpeechAPI(audioData) {
        // 这个方法需要在浏览器环境中运行
        return {
            success: false,
            error: 'Web Speech API需要在浏览器环境中使用',
            suggestion: '请在浏览器中调用此功能'
        };
    }

    /**
     * 使用本地语音识别
     * @param {Buffer} audioData - 音频数据
     * @returns {Object} 识别结果
     */
    async useLocalSpeechRecognition(audioData) {
        try {
            // 使用node-speech-recognition或类似库
            const SpeechRecognition = require('node-speech-recognition');
            
            const recognition = new SpeechRecognition({
                language: 'zh-CN',
                continuous: true,
                interimResults: false
            });
            
            return new Promise((resolve, reject) => {
                recognition.on('result', (result) => {
                    resolve({
                        success: true,
                        text: result.transcript,
                        confidence: result.confidence || 0.8,
                        duration: audioData.length / 16000, // 估算时长
                        language: 'zh-CN',
                        method: 'local-speech-recognition'
                    });
                });
                
                recognition.on('error', (error) => {
                    reject(error);
                });
                
                recognition.start();
                recognition.feed(audioData);
                recognition.stop();
            });
            
        } catch (error) {
            console.log('⚠️ 本地语音识别失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 尝试付费API
     * @param {Buffer} audioData - 音频数据
     * @param {Object} options - 选项
     * @returns {Object} 识别结果
     */
    async tryPaidSpeechRecognition(audioData, options) {
        console.log('💰 尝试付费API方案...');
        
        // 检查是否有API Key
        const apiKey = process.env.OPENAI_API_KEY || options.apiKey;
        if (!apiKey) {
            return { success: false, error: '需要API Key才能使用付费服务' };
        }
        
        try {
            // 使用OpenAI Whisper API
            const response = await axios.post(
                'https://api.openai.com/v1/audio/transcriptions',
                {
                    file: audioData,
                    model: 'whisper-1',
                    language: options.language || 'zh',
                    response_format: 'json'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'multipart/form-data'
                    },
                    timeout: 60000
                }
            );
            
            return {
                success: true,
                text: response.data.text,
                confidence: 0.95, // Whisper通常有很高的准确度
                duration: audioData.length / 16000,
                language: options.language || 'zh',
                method: 'openai-whisper'
            };
            
        } catch (error) {
            console.log('⚠️ OpenAI API失败:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取错误建议
     * @param {string} error - 错误信息
     * @returns {string} 建议
     */
    getErrorSuggestion(error) {
        if (error.includes('ffmpeg')) {
            return '请安装FFmpeg: brew install ffmpeg (macOS) 或 apt-get install ffmpeg (Ubuntu)';
        } else if (error.includes('API Key')) {
            return '请设置OPENAI_API_KEY环境变量或提供API Key';
        } else if (error.includes('网络')) {
            return '请检查网络连接，或稍后重试';
        } else {
            return '建议使用在线工具如Kapwing或Dictationer进行转换';
        }
    }

    /**
     * 获取可用的免费方案
     * @returns {Array} 免费方案列表
     */
    getFreeOptions() {
        return [
            {
                name: '浏览器原生识别',
                description: '使用Web Speech API，无需安装',
                pros: ['完全免费', '无需API Key', '支持实时识别'],
                cons: ['需要浏览器环境', '准确度一般', '需要用户授权'],
                implementation: 'client-side'
            },
            {
                name: '在线工具',
                description: '使用第三方免费服务',
                pros: ['高准确度', '支持多语言', '无需安装'],
                cons: ['有使用限制', '需要上传文件', '依赖网络'],
                services: ['Kapwing', 'Dictationer', 'Clideo']
            },
            {
                name: '本地识别',
                description: '使用开源语音识别库',
                pros: ['隐私安全', '无网络依赖', '可定制'],
                cons: ['需要安装依赖', '准确度一般', '资源消耗大'],
                libraries: ['SpeechRecognition', 'PocketSphinx']
            }
        ];
    }
}

// 测试函数
async function testVideoSpeechToText() {
    console.log('🎤 测试视频语音转文字');
    console.log('='.repeat(50));
    
    const converter = new VideoSpeechToText();
    const testVideoUrl = 'https://example.com/test-video.mp4';
    
    try {
        const result = await converter.convertVideoToText(testVideoUrl);
        
        if (result.success) {
            console.log('\n🎉 转换成功！');
            console.log('📊 结果:');
            console.log('   文本:', result.text);
            console.log('   置信度:', result.confidence);
            console.log('   时长:', result.duration + '秒');
            console.log('   语言:', result.language);
            console.log('   方法:', result.method);
        } else {
            console.log('\n❌ 转换失败:', result.error);
            console.log('💡 建议:', result.suggestion);
        }
    } catch (error) {
        console.log('\n❌ 测试失败:', error.message);
    }
    
    console.log('\n📋 免费方案:');
    const freeOptions = converter.getFreeOptions();
    freeOptions.forEach((option, index) => {
        console.log(`${index + 1}. ${option.name}`);
        console.log(`   描述: ${option.description}`);
        console.log(`   优点: ${option.pros.join(', ')}`);
        console.log(`   缺点: ${option.cons.join(', ')}`);
        console.log('');
    });
}

if (require.main === module) {
    testVideoSpeechToText().catch(console.error);
}

module.exports = VideoSpeechToText;
