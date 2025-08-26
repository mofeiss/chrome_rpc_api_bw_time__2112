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
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`收到客户端 ${clientId} 的消息：`, data);
            
            // 如果是任务结果回复
            if (data.requestId && pendingRequests.has(data.requestId)) {
                const { res } = pendingRequests.get(data.requestId);
                res.json({
                    success: true,
                    result: data.result,
                    clientId: clientId
                });
                pendingRequests.delete(data.requestId);
                console.log(`任务 ${data.requestId} 已完成`);
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
app.post('/sig', (req, res) => {
    const { wxOpenid, prizeWord } = req.body;
    
    if (!wxOpenid) {
        return res.status(400).json({ error: '缺少参数 wxOpenid' });
    }
    
    if (!prizeWord) {
        return res.status(400).json({ error: '缺少参数 prizeWord' });
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
    
    // 存储待处理的请求
    pendingRequests.set(requestId, { res });
    
    // 设置超时处理
    const timeout = setTimeout(() => {
        if (pendingRequests.has(requestId)) {
            pendingRequests.delete(requestId);
            res.status(504).json({ error: '请求超时' });
        }
    }, 30000); // 30秒超时
    
    // 发送任务到选中的客户端
    const task = {
        requestId,
        wxOpenid,
        prizeWord
    };
    
    selectedWs.send(JSON.stringify(task));
    console.log(`任务 ${requestId} 已发送到客户端 ${selectedClientId}，参数：wxOpenid=${wxOpenid}, prizeWord=${prizeWord}`);
    
    // 清理超时器
    const originalRes = pendingRequests.get(requestId)?.res;
    if (originalRes) {
        pendingRequests.set(requestId, { 
            res: {
                ...originalRes,
                json: (data) => {
                    clearTimeout(timeout);
                    originalRes.json(data);
                }
            }
        });
    }
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
