const express = require('express')
const expressWs = require('express-ws')

const app = express()
expressWs(app)

const port = process.env.PORT || 3001
let connects = []
let messages = [] // メッセージとリアクションを管理する配列

app.use(express.static('public'))

app.ws('/ws', (ws, req) => {
  connects.push(ws)

  // 新しい接続があったら、これまでのメッセージを送信
  messages.forEach(msg => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(msg));
    }
  });

  ws.on('message', (message) => {
    console.log('Received:', message)
    const parsedMessage = JSON.parse(message)

    if (parsedMessage.type === 'chat') {
      const messageId = self.crypto.randomUUID().substr(0, 8); // メッセージに一意のIDを付与
      const chatMessage = {
        id: parsedMessage.id,
        text: parsedMessage.text,
        type: 'chat',
        messageId: messageId,
        reactions: {
          good: 0,
          bad: 0,
          excited: 0,
          interesting: 0,
          sad: 0
        }
      };
      messages.push(chatMessage); // メッセージを保存
      broadcast(chatMessage);

    } else if (parsedMessage.type === 'reaction') {
      const { messageId, reactionType } = parsedMessage;
      const targetMessage = messages.find(msg => msg.messageId === messageId);

      if (targetMessage && targetMessage.reactions.hasOwnProperty(reactionType)) {
        targetMessage.reactions[reactionType]++;
        // リアクション更新を全クライアントにブロードキャスト
        broadcast({
          type: 'reactionUpdate',
          messageId: messageId,
          reactionType: reactionType,
          count: targetMessage.reactions[reactionType]
        });
      }
    } else if (parsedMessage.type === 'paint') {
      broadcast(parsedMessage);
    }
  })

  ws.on('close', () => {
    connects = connects.filter((conn) => conn !== ws)
  })
})

function broadcast(message) {
  const messageString = JSON.stringify(message);
  connects.forEach((socket) => {
    if (socket.readyState === 1) {
      socket.send(messageString)
    }
  })
}

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
})
