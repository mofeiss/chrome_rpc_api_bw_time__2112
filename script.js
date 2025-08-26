// 注入脚本
window.A = Rw[TV(ZP.EG)];
window.B = Ri;
window.C = this;

// 浏览器端 WebSocket 客户端脚本

(function () {
  let ws = null;
  let reconnectInterval = null;
  let isManualClose = false;
  let isConnecting = false; // 添加连接状态标记
  let reconnectAttempts = 0; // 重连尝试次数
  const maxReconnectAttempts = 1000000; // 最大重连次数
  const reconnectDelay = 3000; // 重连延迟

  // 您的任务函数
  function job(wxOpenid, prizeWord) {
    C.sendBody = `{"wxOpenid":"${wxOpenid}","prizeWord":"${prizeWord}","batchNo":"20250826"}`;
    C.apiAttr.timestamp = new Date().getTime();
    A(B, C);
    return C.openArgs[1];
  }

  // 清理现有连接和定时器
  function cleanup() {
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }

    if (ws) {
      // 移除所有事件监听器，防止触发重连
      ws.onopen = null;
      ws.onmessage = null;
      ws.onclose = null;
      ws.onerror = null;

      // 如果连接还存在且未关闭，则关闭它
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      ws = null;
    }

    isConnecting = false;
  }

  // 连接到 WebSocket 服务器
  function connectWebSocket() {
    // 如果已经在连接中或已有有效连接，直接返回
    if (isConnecting || (ws && ws.readyState === WebSocket.OPEN)) {
      return;
    }

    // 检查重连次数限制
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error('已达到最大重连次数，停止重连');
      return;
    }

    isConnecting = true;

    try {
      // 清理旧连接
      cleanup();

      console.log(`尝试连接 WebSocket 服务器... (第 ${reconnectAttempts + 1} 次)`);
      ws = new WebSocket('ws://localhost:3000');

      ws.onopen = function () {
        console.log('WebSocket 连接已建立');
        isConnecting = false;
        reconnectAttempts = 0; // 连接成功后重置重连次数

        // 清理重连定时器
        if (reconnectInterval) {
          clearInterval(reconnectInterval);
          reconnectInterval = null;
        }
      };

      ws.onmessage = function (event) {
        try {
          const data = JSON.parse(event.data);
          console.log('收到服务器任务：', data);

          if (data.requestId && data.wxOpenid && data.prizeWord) {
            // 执行任务
            console.log('开始执行任务，参数：', { wxOpenid: data.wxOpenid, prizeWord: data.prizeWord });

            try {
              const result = job(data.wxOpenid, data.prizeWord);
              console.log('任务执行完成，结果：', result);

              // 发送结果回服务器
              const response = {
                requestId: data.requestId,
                result: result,
              };

              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(response));
                console.log('任务结果已发送回服务器');
              }
            } catch (error) {
              console.error('执行任务时出错：', error);

              // 发送错误信息回服务器
              const errorResponse = {
                requestId: data.requestId,
                result: null,
                error: error.message,
              };

              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(errorResponse));
              }
            }
          }
        } catch (error) {
          console.error('解析服务器消息失败：', error);
        }
      };

      ws.onclose = function (event) {
        console.log('WebSocket 连接已关闭', event.code, event.reason);
        isConnecting = false;

        // 只有在非手动关闭且未达到最大重连次数时才重连
        if (!isManualClose && reconnectAttempts < maxReconnectAttempts) {
          console.log(`${reconnectDelay / 1000}秒后尝试重连...`);

          // 清理现有的重连定时器
          if (reconnectInterval) {
            clearInterval(reconnectInterval);
          }

          reconnectInterval = setTimeout(() => {
            reconnectAttempts++;
            connectWebSocket();
          }, reconnectDelay);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          console.error('已达到最大重连次数，停止重连');
        }
      };

      ws.onerror = function (error) {
        console.error('WebSocket 错误：', error);
        isConnecting = false;
        reconnectAttempts++;
      };
    } catch (error) {
      console.error('创建 WebSocket 连接失败：', error);
      isConnecting = false;
      reconnectAttempts++;
    }
  }

  // 手动关闭连接
  function closeConnection() {
    console.log('手动关闭 WebSocket 连接');
    isManualClose = true;
    cleanup();
    reconnectAttempts = maxReconnectAttempts; // 阻止重连
  }

  // 重置连接（重新开始连接）
  function resetConnection() {
    console.log('重置 WebSocket 连接');
    isManualClose = false;
    reconnectAttempts = 0;
    cleanup();
    connectWebSocket();
  }

  // 检查连接状态
  function getConnectionStatus() {
    return {
      isConnected: ws && ws.readyState === WebSocket.OPEN,
      isConnecting: isConnecting,
      reconnectAttempts: reconnectAttempts,
      isManualClose: isManualClose,
    };
  }

  // 启动连接
  console.log('开始连接 WebSocket 服务器...');
  connectWebSocket();

  // 将函数暴露到全局，方便手动操作
  window.closeWebSocketConnection = closeConnection;
  window.resetWebSocketConnection = resetConnection;
  window.getWebSocketStatus = getConnectionStatus;

  console.log('WebSocket 客户端已启动');
  console.log('可用命令:');
  console.log('- closeWebSocketConnection(): 关闭连接');
  console.log('- resetWebSocketConnection(): 重置并重新连接');
  console.log('- getWebSocketStatus(): 查看连接状态');

  // 页面卸载时清理资源
  window.addEventListener('beforeunload', function () {
    closeConnection();
  });
})();
