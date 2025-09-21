// 测试API函数（CommonJS版本）
module.exports = function handler(req, res) {
    res.status(200).json({ 
        message: 'Hello from Vercel API!',
        timestamp: new Date().toISOString(),
        method: req.method
    });
}