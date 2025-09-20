/**
 * 抖音调试工具
 * 用于调试和分析抖音API调用过程
 */

const fs = require('fs').promises;
const path = require('path');

class DouyinDebugger {
    constructor() {
        this.debugEnabled = process.env.NODE_ENV === 'development' || process.env.DOUYIN_DEBUG === 'true';
        this.logs = [];
        this.maxLogs = 1000;
        this.logFile = path.join(__dirname, '../logs/douyin-debug.log');
        this.sessionId = this.generateSessionId();
        
        // 创建日志目录
        this.ensureLogDirectory();
        
        console.log(`🐛 DouyinDebugger: 调试器已启动 (Session: ${this.sessionId})`);
    }

    /**
     * 生成会话ID
     * @returns {string} 会话ID
     */
    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    /**
     * 确保日志目录存在
     */
    async ensureLogDirectory() {
        try {
            const logDir = path.dirname(this.logFile);
            await fs.mkdir(logDir, { recursive: true });
        } catch (error) {
            console.warn('⚠️ DouyinDebugger: 无法创建日志目录:', error.message);
        }
    }

    /**
     * 记录调试信息
     * @param {string} level 日志级别
     * @param {string} message 消息
     * @param {Object} data 附加数据
     */
    log(level, message, data = null) {
        if (!this.debugEnabled && level === 'debug') {
            return;
        }

        const logEntry = {
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            level: level.toUpperCase(),
            message,
            data: data ? this.sanitizeData(data) : null,
            stack: level === 'error' ? new Error().stack : null
        };

        // 添加到内存日志
        this.logs.push(logEntry);
        
        // 保持日志数量限制
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // 输出到控制台
        this.consoleLog(logEntry);

        // 异步写入文件
        this.writeToFile(logEntry);
    }

    /**
     * 控制台输出
     * @param {Object} logEntry 日志条目
     */
    consoleLog(logEntry) {
        const { level, message, data } = logEntry;
        const prefix = this.getLogPrefix(level);
        
        let output = `${prefix} ${message}`;
        
        if (data) {
            output += `\n${JSON.stringify(data, null, 2)}`;
        }

        switch (level) {
            case 'ERROR':
                console.error(output);
                break;
            case 'WARN':
                console.warn(output);
                break;
            case 'INFO':
                console.info(output);
                break;
            case 'DEBUG':
                console.debug(output);
                break;
            default:
                console.log(output);
        }
    }

    /**
     * 获取日志前缀
     * @param {string} level 日志级别
     * @returns {string} 前缀
     */
    getLogPrefix(level) {
        const timestamp = new Date().toLocaleTimeString();
        const prefixes = {
            ERROR: '❌',
            WARN: '⚠️',
            INFO: 'ℹ️',
            DEBUG: '🐛'
        };
        
        return `${prefixes[level] || '📝'} [${timestamp}] DouyinDebugger:`;
    }

    /**
     * 清理敏感数据
     * @param {Object} data 原始数据
     * @returns {Object} 清理后的数据
     */
    sanitizeData(data) {
        if (!data || typeof data !== 'object') {
            return data;
        }

        const sanitized = JSON.parse(JSON.stringify(data));
        const sensitiveKeys = ['password', 'token', 'key', 'secret', 'cookie', 'authorization'];
        
        const sanitizeObject = (obj) => {
            if (Array.isArray(obj)) {
                return obj.map(item => sanitizeObject(item));
            }
            
            if (obj && typeof obj === 'object') {
                const result = {};
                for (const [key, value] of Object.entries(obj)) {
                    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                        result[key] = '[REDACTED]';
                    } else {
                        result[key] = sanitizeObject(value);
                    }
                }
                return result;
            }
            
            return obj;
        };

        return sanitizeObject(sanitized);
    }

    /**
     * 写入日志文件
     * @param {Object} logEntry 日志条目
     */
    async writeToFile(logEntry) {
        try {
            const logLine = JSON.stringify(logEntry) + '\n';
            await fs.appendFile(this.logFile, logLine, 'utf8');
        } catch (error) {
            console.warn('⚠️ DouyinDebugger: 写入日志文件失败:', error.message);
        }
    }

    /**
     * 调试API请求
     * @param {string} url 请求URL
     * @param {Object} options 请求选项
     * @param {Object} response 响应数据
     */
    debugApiRequest(url, options = {}, response = null) {
        this.log('debug', 'API请求调试信息', {
            url,
            method: options.method || 'GET',
            headers: this.sanitizeData(options.headers),
            timeout: options.timeout,
            responseStatus: response?.status,
            responseTime: response?.responseTime,
            responseSize: response?.data ? JSON.stringify(response.data).length : 0
        });
    }

    /**
     * 调试视频ID提取
     * @param {string} originalUrl 原始URL
     * @param {string} expandedUrl 展开的URL
     * @param {string} videoId 提取的视频ID
     * @param {Array} patterns 使用的模式
     */
    debugVideoIdExtraction(originalUrl, expandedUrl, videoId, patterns) {
        this.log('debug', '视频ID提取调试', {
            originalUrl,
            expandedUrl,
            extractedVideoId: videoId,
            patternsUsed: patterns.map(p => p.toString()),
            extractionSuccess: !!videoId
        });
    }

    /**
     * 调试数据解析
     * @param {string} parser 解析器名称
     * @param {Object} rawData 原始数据
     * @param {Object} parsedData 解析后数据
     * @param {Error} error 解析错误
     */
    debugDataParsing(parser, rawData, parsedData, error = null) {
        this.log('debug', `数据解析调试 - ${parser}`, {
            parser,
            rawDataKeys: rawData ? Object.keys(rawData) : [],
            rawDataSize: rawData ? JSON.stringify(rawData).length : 0,
            parsedDataKeys: parsedData ? Object.keys(parsedData) : [],
            parseSuccess: !error,
            error: error?.message
        });
    }

    /**
     * 调试缓存操作
     * @param {string} operation 操作类型
     * @param {string} key 缓存键
     * @param {boolean} hit 是否命中
     * @param {number} size 缓存大小
     */
    debugCache(operation, key, hit = null, size = null) {
        this.log('debug', `缓存操作 - ${operation}`, {
            operation,
            key: this.hashString(key), // 对键进行哈希以保护隐私
            hit,
            cacheSize: size
        });
    }

    /**
     * 调试网络错误
     * @param {Error} error 网络错误
     * @param {string} url 请求URL
     * @param {Object} config 请求配置
     */
    debugNetworkError(error, url, config = {}) {
        this.log('error', '网络请求错误', {
            errorMessage: error.message,
            errorCode: error.code,
            url,
            method: config.method,
            timeout: config.timeout,
            retryCount: config.retryCount || 0,
            stack: error.stack
        });
    }

    /**
     * 性能测试开始
     * @param {string} testName 测试名称
     * @returns {string} 测试ID
     */
    startPerformanceTest(testName) {
        const testId = `${testName}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        
        this.log('info', `性能测试开始: ${testName}`, {
            testId,
            testName,
            startTime: Date.now()
        });

        return testId;
    }

    /**
     * 性能测试结束
     * @param {string} testId 测试ID
     * @param {Object} results 测试结果
     */
    endPerformanceTest(testId, results = {}) {
        const endTime = Date.now();
        
        this.log('info', `性能测试结束: ${testId}`, {
            testId,
            endTime,
            results,
            duration: results.startTime ? endTime - results.startTime : null
        });
    }

    /**
     * 获取调试统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        const levelCounts = {};
        let totalSize = 0;

        this.logs.forEach(log => {
            levelCounts[log.level] = (levelCounts[log.level] || 0) + 1;
            totalSize += JSON.stringify(log).length;
        });

        return {
            sessionId: this.sessionId,
            debugEnabled: this.debugEnabled,
            totalLogs: this.logs.length,
            levelCounts,
            memoryUsage: `${Math.round(totalSize / 1024)} KB`,
            oldestLog: this.logs.length > 0 ? this.logs[0].timestamp : null,
            newestLog: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : null
        };
    }

    /**
     * 导出调试日志
     * @param {string} format 导出格式 ('json' | 'text')
     * @returns {string} 导出的日志内容
     */
    exportLogs(format = 'json') {
        if (format === 'json') {
            return JSON.stringify(this.logs, null, 2);
        } else if (format === 'text') {
            return this.logs.map(log => {
                let line = `[${log.timestamp}] ${log.level}: ${log.message}`;
                if (log.data) {
                    line += `\nData: ${JSON.stringify(log.data, null, 2)}`;
                }
                if (log.stack) {
                    line += `\nStack: ${log.stack}`;
                }
                return line;
            }).join('\n\n');
        }
        
        return '';
    }

    /**
     * 清空日志
     */
    clearLogs() {
        this.logs = [];
        this.log('info', '调试日志已清空');
    }

    /**
     * 简单的字符串哈希函数（用于键的匿名化）
     * @param {string} str 输入字符串
     * @returns {string} 哈希值
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36).substr(0, 8);
    }

    /**
     * 便捷的日志方法
     */
    error(message, data) { this.log('error', message, data); }
    warn(message, data) { this.log('warn', message, data); }
    info(message, data) { this.log('info', message, data); }
    debug(message, data) { this.log('debug', message, data); }
}

// 创建全局调试器实例
const douyinDebugger = new DouyinDebugger();

module.exports = douyinDebugger;
