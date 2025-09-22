#!/bin/bash

# 抖音视频下载器 - Nginx部署脚本
# 使用方法: ./deploy.sh

echo "🚀 开始打包抖音视频下载器..."

# 检查Node.js版本
node_version=$(node -v)
echo "📋 Node.js版本: $node_version"

# 安装生产依赖
echo "📦 安装生产依赖..."
npm install --production --silent

# 创建生产环境打包
echo "📁 创建生产环境压缩包..."
tar -czf douyin-video-download-production.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=logs \
  --exclude=*.log \
  --exclude=.DS_Store \
  --exclude=.vscode \
  --exclude=.idea \
  --exclude=*.md \
  --exclude=vercel.json \
  --exclude=deploy.sh \
  .

# 创建包含依赖的完整包
echo "📁 创建完整压缩包..."
tar -czf douyin-video-download-full.tar.gz \
  --exclude=.git \
  --exclude=logs \
  --exclude=*.log \
  --exclude=.DS_Store \
  --exclude=.vscode \
  --exclude=.idea \
  --exclude=*.md \
  --exclude=vercel.json \
  --exclude=deploy.sh \
  .

echo "✅ 打包完成！"
echo ""
echo "📋 生成的文件："
echo "  - douyin-video-download-production.tar.gz (推荐，需要在服务器安装依赖)"
echo "  - douyin-video-download-full.tar.gz (完整包，包含所有依赖)"
echo ""
echo "🔧 Nginx部署步骤："
echo "1. 上传压缩包到服务器"
echo "2. 解压: tar -xzf douyin-video-download-production.tar.gz"
echo "3. 安装依赖: npm install --production"
echo "4. 启动服务: npm start"
echo "5. 配置Nginx反向代理到端口3000"
echo ""
echo "📝 Nginx配置示例："
echo "location / {"
echo "    proxy_pass http://localhost:3000;"
echo "    proxy_set_header Host \$host;"
echo "    proxy_set_header X-Real-IP \$remote_addr;"
echo "    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
echo "}"
