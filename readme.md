# WebSocket 任务分发系统

一个基于 WebSocket 的任务分发系统，支持在浏览器环境中执行签名生成任务，并返回带有签名参数的 URL。

## 系统架构

- **Server.js**: WebSocket 服务器和 RESTful API 接口
- **Script.js**: 浏览器端客户端脚本，负责签名生成
- **流程**: 用户调用 API → 浏览器生成签名 URL → 返回签名 URL 和参数

## 使用方法

### 1. 环境准备

首次使用需要安装依赖：

```bash
pnpm install
```

### 2. 启动服务器

```bash
node server.js
```

服务器启动后会显示：
```
服务器运行在端口 3000
WebSocket 服务: ws://localhost:3000
API 接口: http://localhost:3000/sig
```

### 3. 配置浏览器客户端

#### 3.1 打开目标网页

访问活动页面：
```
https://game-center.chagee.com/chagee-fc-dancong-activity-h5/index.html#/?openid=ouNp05cvEvl00Uw5VVN6J7HJY_fA
```

#### 3.2 设置调试断点

1. 打开开发者控制台（F12）
2. 点击控制台右上角的菜单按钮（3个竖点）
3. 选择 "搜索" 或 "Search"
4. 输入搜索条件：`Rw[TV(ZP.EG)](Ri,this)`
5. 找到 `jquery.min.js` 中的搜索结果，双击跳转
6. 在该行左侧设置断点（点击行号，显示蓝色标记）

#### 3.3 注入客户端脚本

1. 在活动页面输入任意口令，点击 "立即领取"
2. 页面会在断点处暂停执行
3. 在控制台中复制粘贴 `script.js` 的完整代码并执行
4. 看到 "WebSocket 客户端已启动" 等日志信息

#### 3.4 放行断点并保持连接

1. 取消断点（再次点击蓝色标记）
2. 点击调试器的继续按钮（三角形图标）
3. 最小化浏览器窗口，保持页面在后台运行

## API 调用

> **新版功能**：API 现在返回签名 URL 和相关参数，用户可以自行决定是否发起请求

### 请求示例

```bash
curl -X POST http://localhost:3000/sig \\
  -H "Content-Type: application/json" \\
  -d '{"wxOpenid":"ouNp05cvEvl00Uw5VVN6J7HJY_fA","prizeWord":"凤凰于飞","batchNo":"20250826"}'
```

### 返回值示例

现在返回签名 URL 和相关参数：

```json
{
  "signedUrl": "https://game-center.chagee.com/chagee-bc-dancong-activity-api/danCong/api/claimRewards?time__2112=28178cb220-7Sn6RTs0PxTx...",
  "requestParams": {
    "wxOpenid": "ouNp05cvEvl00Uw5VVN6J7HJY_fA",
    "prizeWord": "凤凰于飞",
    "batchNo": "20250826"
  }
}
```

用户可以使用返回的签名 URL 和参数自行发起 POST 请求。

## 流程说明

1. **用户调用 API**: 调用 `/sig` 接口，传递完整参数（`wxOpenid`、`prizeWord`、`batchNo`）
2. **任务分发**: 服务端通过 WebSocket 将任务发送给在线的浏览器客户端
3. **签名生成**: 浏览器端执行签名算法，生成带有 `time__2112` 签名的 URL
4. **结果返回**: 浏览器端将签名 URL 和参数通过 WebSocket 返回给服务端
5. **API 响应**: 服务端将签名 URL 和参数返回给 API 调用者

### 核心优势

- ✅ **签名生成**: 在浏览器环境中生成带签名的 URL
- ✅ **浏览器环境优势**: 绕过安全检测，具有完整的 Cookie 和 Session
- ✅ **自动负载均衡**: 支持多个浏览器客户端，随机分发任务
- ✅ **灵活性**: 返回签名 URL，用户可自行决定是否发起请求
- ✅ **实时状态监控**: 支持查看在线客户端和待处理请求数量

## API 参数说明

### `/sig` 接口

| 参数名      | 类型   | 必需 | 说明            |
| ----------- | ------ | ---- | --------------- |
| `wxOpenid`  | string | 是   | 微信用户 OpenID |
| `prizeWord` | string | 是   | 奖品口令/关键词 |
| `batchNo`   | string | 是   | 批次号（如 "20250826"） |

### 返回值

现在返回签名 URL 和相关参数：

| 字段名     | 类型    | 说明                |
| ---------- | ------- | ------------------- |
| `signedUrl` | string  | 带有签名参数的 URL |
| `requestParams` | object  | 请求参数对象 |
| `requestParams.wxOpenid` | string  | 微信用户 OpenID |
| `requestParams.prizeWord` | string  | 奖品口令/关键词 |
| `requestParams.batchNo` | string  | 批次号 |

## 高级功能

### 状态监控

查看系统状态：

```bash
curl http://localhost:3000/status
```

返回示例：
```json
{
  "onlineClients": 2,
  "pendingRequests": 0
}
```

### 浏览器端调试命令

在浏览器控制台中可以使用以下命令：

```javascript
// 查看连接状态
getWebSocketStatus()

// 手动关闭连接
closeWebSocketConnection()

// 重置并重新连接
resetWebSocketConnection()
```

## 故障排除

### 常见问题

**1. 服务器无法启动**
```bash
# 检查端口是否被占用
netstat -ano | findstr :3000

# 如果端口被占用，可以修改环境变量
set PORT=3001 && node server.js
```

**2. 浏览器客户端连接失败**
- 确保服务器已正常启动
- 检查浏览器控制台是否有错误信息
- 尝试刷新页面并重新注入脚本

**3. API 调用返回 503 错误**
```json
{"error": "没有在线的客户端"}
```
说明没有浏览器客户端连接到服务器，请检查浏览器端配置。

**4. 请求超时**
默认超时时间为 30 秒，如果遇到超时，可能原因：
- 浏览器客户端卡死或崩溃
- 网络连接不稳定
- 目标服务器响应过慢

### 日志监控

服务器端会输出详细的日志信息：

```
客户端 xxx 已连接，当前在线客户端数量：1
任务 xxx 已发送到客户端
任务 xxx 已完成，最终结果：{...}
```

浏览器端也会在控制台输出进度信息：

```
WebSocket 连接已建立
收到服务器任务：{...}
签名 URL 生成完成：...
签名 URL 已发送回服务器
```

## 技术特性

- **节点版本**: Node.js 18+
- **依赖库**: Express, WebSocket (ws), UUID
- **协议**: HTTP/1.1, WebSocket
- **支持浏览器**: Chrome, Firefox, Edge, Safari
- **操作系统**: Windows, macOS, Linux

## 文件结构

```
chrome_rpc_api_bw_time__2112/
├── server.js         # WebSocket 服务器和 API 接口
├── script.js         # 浏览器端客户端脚本
├── package.json      # 项目依赖配置
├── package-lock.json # 依赖版本锁定
└── readme.md         # 项目说明文档
```
