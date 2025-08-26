const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 存储连接的客户端
const clients = new Map();
// 存储待处理的请求
const pendingRequests = new Map();

app.use(express.json());

// 处理 WebSocket 连接
wss.on('connection', (ws) => {
    const clientId = uuidv4();
    clients.set(clientId, ws);
    
    console.log(`客户端 ${clientId} 已连接，当前在线客户端数量：${clients.size}`);
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`收到客户端 ${clientId} 的消息：`, data);
            
            // 如果是最终结果回复
            if (data.requestId && pendingRequests.has(data.requestId)) {
                const { res } = pendingRequests.get(data.requestId);
                pendingRequests.delete(data.requestId);
                
                // 检查是否有错误
                if (data.error) {
                    console.error(`客户端执行失败：`, data.error);
                    return res.status(502).json({ 
                        error: '客户端执行失败',
                        detail: data.error
                    });
                }
                
                // 返回浏览器端获取的最终结果
                console.log(`任务 ${data.requestId} 已完成，最终结果：`, data.finalResult);
                res.json(data.finalResult);
            }
        } catch (error) {
            console.error('解析消息失败：', error);
        }
    });
    
    ws.on('close', () => {
        clients.delete(clientId);
        console.log(`客户端 ${clientId} 已断开连接，当前在线客户端数量：${clients.size}`);
    });
    
    ws.on('error', (error) => {
        console.error(`客户端 ${clientId} 出现错误：`, error);
        clients.delete(clientId);
    });
});

// API 接口：sig
app.post('/sig', async (req, res) => {
    const { wxOpenid, prizeWord, batchNo } = req.body;
    
    if (!wxOpenid) {
        return res.status(400).json({ error: '缺少参数 wxOpenid' });
    }
    
    if (!prizeWord) {
        return res.status(400).json({ error: '缺少参数 prizeWord' });
    }
    
    if (!batchNo) {
        return res.status(400).json({ error: '缺少参数 batchNo' });
    }
    
    // 获取在线客户端列表
    const onlineClients = Array.from(clients.entries()).filter(([_, ws]) => ws.readyState === WebSocket.OPEN);
    
    if (onlineClients.length === 0) {
        return res.status(503).json({ error: '没有在线的客户端' });
    }
    
    // 随机选择一个客户端
    const randomIndex = Math.floor(Math.random() * onlineClients.length);
    const [selectedClientId, selectedWs] = onlineClients[randomIndex];
    
    const requestId = uuidv4();
    
    // 存储待处理的请求（同时存储完整参数）
    pendingRequests.set(requestId, { res, payload: { wxOpenid, prizeWord, batchNo } });
    
    // 设置超时处理
    const timeout = setTimeout(() => {
        if (pendingRequests.has(requestId)) {
            pendingRequests.delete(requestId);
            res.status(504).json({ error: '请求超时' });
        }
    }, 30000); // 30秒超时
    
    // 发送任务到选中的客户端（将完整参数作为 payload 发送）
    const task = {
        requestId,
        payload: {
            wxOpenid,
            prizeWord,
            batchNo
        }
    };
    
    selectedWs.send(JSON.stringify(task));
    console.log(`任务 ${requestId} 已发送到客户端 ${selectedClientId}，参数：wxOpenid=${wxOpenid}, prizeWord=${prizeWord}, batchNo=${batchNo}`);
    
    // 不再需要这个复杂的超时器清理逻辑，因为现在是在消息处理中使用 async/await
});

// 获取状态的接口
app.get('/status', (req, res) => {
    res.json({
        onlineClients: clients.size,
        pendingRequests: pendingRequests.size
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
    console.log(`WebSocket 服务: ws://localhost:${PORT}`);
    console.log(`API 接口: http://localhost:${PORT}/sig`);
});
