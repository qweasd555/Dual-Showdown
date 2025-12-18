const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 3001 });

console.log("WebSocket server running on 3001");

const clients = new Set();

wss.on("connection", ws => {
  console.log("客户端连接");
  clients.add(ws);

  ws.on("message", message => {
    try {
      const data = JSON.parse(message);
      
      // 只处理 mage 的 action 消息
      if (data.type === "action" && data.role === "mage") {
        // 转发为 sync 消息给所有客户端
        const syncMessage = {
          type: "sync",
          role: "mage",
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
      }
    } catch (error) {
      console.error("消息解析错误:", error);
    }
  });

  ws.on("close", () => {
    console.log("客户端断开连接");
    clients.delete(ws);
  });

  ws.on("error", error => {
    console.error("WebSocket 错误:", error);
    clients.delete(ws);
  });
});
