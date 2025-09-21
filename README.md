# DOUYIN-VIDEO-DOWNLOAD

🎬 **最简单的抖音视频信息提取器** - 纯免费API方案

一个简单易用的抖音视频信息提取工具，可以获取视频的详细信息和无水印下载链接。

## ✨ 功能特性

- 🎯 **简单易用**: 只需输入抖音视频链接，一键获取所有信息
- 📝 **详细信息**: 获取视频标题、作者、发布时间、统计数据等
- 💬 **文案提取**: 自动提取视频简介和文案内容
- 📥 **无水印下载**: 提供无水印的高清视频下载链接
- 🚀 **纯免费**: 使用免费API，无需付费服务
- 🎨 **现代UI**: 简洁美观的用户界面
- 📱 **响应式设计**: 支持桌面和移动设备

## 🛠️ 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **后端**: Node.js, Express.js
- **依赖**: axios, cors, dotenv
- **API**: 抖音开放API接口

## 📦 安装使用

### 环境要求

- Node.js >= 14.0.0
- npm >= 6.0.0

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/gccc40684/DOUYIN-VIDEO-DOWNLOAD.git
   cd DOUYIN-VIDEO-DOWNLOAD
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动服务**
   ```bash
   npm start
   ```

4. **访问应用**
   打开浏览器访问: `http://localhost:3000`

### 开发模式

```bash
npm run dev
```

## 🚀 快速开始

1. 在输入框中粘贴抖音视频链接
2. 点击"获取信息"按钮
3. 等待系统提取视频信息
4. 查看视频详情和统计数据
5. 复制文案内容或下载无水印视频

## 📁 项目结构

```
DOUYIN-VIDEO-DOWNLOAD/
├── assets/                 # 静态资源
│   └── myImg.jpg         # 作者头像
├── copywriting/          # 文案处理模块
│   ├── client-speech-recognition.js
│   ├── video-content-extractor.js
│   └── video-speech-to-text.js
├── videoextraction/      # 视频提取核心模块
│   ├── api-config.js    # API配置
│   ├── api-sources.js   # API源管理
│   ├── backend-proxy.js # 后端代理
│   ├── douyin-api-direct.js # 抖音API直接调用
│   ├── douyin-debugger.js # 调试工具
│   └── video-url-extractor.js # 视频URL提取器
├── logs/                # 日志文件
├── index.html           # 主页面
├── script.js           # 前端脚本
├── style.css           # 样式文件
├── server.js           # 服务器入口
├── package.json        # 项目配置
└── README.md           # 项目说明
```

## 🔧 配置说明

### API配置

项目使用多个API源来确保服务的稳定性：

- **主要API**: 抖音官方API接口
- **备用API**: 第三方解析服务
- **代理服务**: 后端代理转发

### 环境变量

创建 `.env` 文件（可选）：

```env
PORT=3000
NODE_ENV=development
```

## 📊 功能模块

### 1. 视频信息提取
- 视频标题和描述
- 作者信息和头像
- 发布时间和视频ID
- 点赞、评论、分享数据

### 2. 文案处理
- 自动提取视频简介
- 支持文案导出功能
- 智能内容格式化

### 3. 下载功能
- 无水印高清视频下载
- 多种分辨率支持
- 直接下载链接生成

## 🤝 贡献指南

欢迎提交Issue和Pull Request来帮助改进项目！

### 贡献步骤

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## ⚠️ 免责声明

本项目仅供学习交流使用，请遵守相关法律法规和平台规则。使用者需自行承担使用风险。

## 📞 联系方式

- 作者: 凡人
- 公众号：凡人的AI工具箱
- 项目地址: [https://github.com/gccc40684/DOUYIN-VIDEO-DOWNLOAD](https://github.com/gccc40684/DOUYIN-VIDEO-DOWNLOAD)
<img width="442" height="422" alt="image" src="https://github.com/user-attachments/assets/68095a1c-74ee-4343-ae8f-004e9c84d562" />

## 🙏 致谢

感谢所有为开源社区做出贡献的开发者们！

---

⭐ 如果这个项目对您有帮助，请给个Star支持一下！
