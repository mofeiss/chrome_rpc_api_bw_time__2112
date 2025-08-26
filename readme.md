# WebSocket 任务分发系统

## 使用方法

### 1. 启动 API 接口服务器

```bash
node server.js
```

如果报错就先执行：

```bash
pnpm i
```

只需要执行一次，以后都不需要了，然后再执行 `node server.js`

### 2. 打开浏览器

访问网页：

```
https://game-center.chagee.com/chagee-fc-dancong-activity-h5/index.html#/?openid=ouNp05cvEvl00Uw5VVN6J7HJY_fA
```

### 3. 设置调试断点

1. 打开开发者控制台
2. 点控制台右上角那个关闭按钮左边的 3 个竖点
3. 点击里面的 "搜索" 或者 "search"
4. 输入：`Rw[TV(ZP.EG)](Ri,this)` 按回车
5. 会找到一个搜索结果，叫 `jquery.min.js` 的结果，双击跳转过去
6. 点击这一行最左边的 `-` 设置断点，点完以后会显示为蓝色块

### 4. 注入脚本

1. 在网页里随便输入一个口令，点击 "立即领取"
2. 此时网页会断下来卡住，停在刚刚那一行
3. 在控制台里输入 `script.js` 里的完整代码，输入完就按回车

### 5. 放行断点

1. 将刚刚那个断点放行，就是蓝色块那里再点一下取消，再点击调试查看上边的三角形继续
2. 浏览器放在那里最小化，不要关闭

## API 调用

> **注意**：API 参数已修改，现在需要同时传递 `wxOpenid` 和 `prizeWord` 两个参数

### 请求示例

```bash
curl -X POST http://localhost:3000/sig \
  -H "Content-Type: application/json" \
  -d '{"wxOpenid":"ouNp05cvEvl00Uw5VVN6J7HJY_fA","prizeWord":"凤凰于飞"}'
```

### 返回值示例

```json
{
  "success": true,
  "result": "https://game-center.chagee.com/chagee-bc-dancong-activity-api/danCong/api/claimRewards?time__2112=28178cb220-8Um6gTdxJxJ7_M0g0TzlUP_JgTHTHUx6PS0lT2izHBTMeIzIsUlSeqX0nx4BZtQ6UH0sJie7t1TPXT83T%2FTJUPCT22iJ1TliJwTMi6TDTMlfZ8PH45y4K6H0ITlZTT5T0y3T0eB6JR23TVTmUJjTUJfBUJCbQc3ipfxglUItPZ60dy3HgTZ1TlrJgyqJOk6T",
  "clientId": "2638e1f0-2d91-44ac-bee7-aa1f2e55579d"
}
```

返回来的 URL 就包含了 `time__2112` 签名，你整个取出来就可以用了，它是和你提交的口令绑定的。

## 最终接口调用

使用返回的签名 URL 进行最终的接口调用：

```bash
curl -X POST 'https://game-center.chagee.com/chagee-bc-dancong-activity-api/danCong/api/claimRewards?time__2112=28178cb220-8Um6gTdxJxJ7_M0g0TzlUP_JgTHTHUx6PS0lT2izHBTMeIzIsUlSeqIOu4B30nQ6U0PJZ8xkt1TPXT83T%2FTJUPCT22iJ1TliJwTMi6TDTMlfZ8PH45y4K6H0ITlZTT5T0y3T0eB6JR23TVTmUJjTUJfBUJCHEWxlPiqj6d0iEUeSg0qlJUUjET_TZUlOpflv%2FT' \
  -H 'Content-Type: application/json; charset=UTF-8' \
  --data-raw '{"wxOpenid":"ouNp05cvEvl00Uw5VVN6J7HJY_fA","prizeWord":"凤凰于飞","batchNo":"20250826"}'
```

### 响应示例

```json
{
  "code": "E005",
  "message": "已参与",
  "data": null,
  "success": false
}
```

## API 参数说明

### `/sig` 接口

| 参数名      | 类型   | 必需 | 说明            |
| ----------- | ------ | ---- | --------------- |
| `wxOpenid`  | string | 是   | 微信用户 OpenID |
| `prizeWord` | string | 是   | 奖品口令/关键词 |

### 返回值

| 字段名     | 类型    | 说明                |
| ---------- | ------- | ------------------- |
| `success`  | boolean | 操作是否成功        |
| `result`   | string  | 签名后的 URL        |
| `clientId` | string  | 处理请求的客户端 ID |

## 文件结构

- `server.js` - WebSocket 服务器和 API 接口
- `script.js` - 浏览器端客户端脚本
- `package.json` - 项目依赖配置
- `readme.md` - 项目说明文档
