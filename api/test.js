// 测试API函数（CommonJS版本）
module.exports = function handler(req, res) {
    res.status(200).json({ 
        success: true,
        message: 'API测试成功',
        timestamp: new Date().toISOString(),
        method: req.method
    });
}