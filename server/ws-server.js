const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3001 });

console.log("WebSocket server running on 3001");

const clients = new Set();
let hostClient = null;

wss.on("connection", ws => {
  console.log("客户端连接");
  clients.add(ws);

  ws.on("message", message => {
    try {
      const data = JSON.parse(message);
      
      // 处理初始化消息
      if (data.type === "init") {
        // 第一个连接的成为主机
        const isHost = !hostClient;
        const role = isHost ? "mage" : "mechanician";
        
        if (isHost) {
          hostClient = ws;
        }
        
        ws.send(JSON.stringify({
          type: "init",
          isHost: isHost,
          role: role
        }));
        
        console.log(`玩家加入: ${role}, 是否主机: ${isHost}`);
        return;
      }
      
      // 处理法师的action消息 - 主机广播
      if (data.type === "action" && data.role === "mage") {
        console.log(`收到法师动作: ${data.action}`);
        
        // 转发为sync消息给所有客户端
        const syncMessage = {
          type: "sync",
          role: data.role,
          action: data.action,
          dir: data.dir,
          skill: data.skill,
          state: data.state
        };
        
        // 向所有客户端广播
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(syncMessage));
          }
        });
        
        return;
      }
      
      // 处理机械师的action消息 - 主机广播
      if (data.type === "action" && data.role === "mechanician") {
        console.log(`收到机械师动作: ${data.action}`);
        
        // 转发为sync消息给所有客户端
        const syncMessage = {
          type: "sync",
          role: data.role,
          action: data.action,
          dir: data.dir,
          skill: data.skill
        };
        
        // 向所有客户端广播
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(syncMessage));
          }
        });
        
        return;
      }
      
      // 广播所有sync消息
      if (data.type === "sync") {
        console.log(`广播同步消息: ${data.action}`);
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
        return;
      }
      
    } catch (error) {
      console.error("消息解析错误:", error);
    }
  });

  ws.on("close", () => {
    console.log("客户端断开连接");
    clients.delete(ws);
    
    // 如果断开的是主机，重置主机
    if (ws === hostClient) {
      hostClient = null;
    }
  });

  ws.on("error", error => {
    console.error("WebSocket 错误:", error);
    clients.delete(ws);
    
    // 如果出错的是主机，重置主机
    if (ws === hostClient) {
      hostClient = null;
    }
  });
});