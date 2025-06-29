const express = require('express')
const expressWs = require('express-ws')
const crypto = require('crypto') // ユニークID生成のために追加

const app = express()
expressWs(app)

const port = process.env.PORT || 3001
let connects = []

// メッセージとそのリアクションの状態を保持するMap
// Key: messageId, Value: { senderId, text, reactions: { good: 0, bad: 0, ... } }
let messages = new Map()

app.use(express.static('public'))

// WebSocket接続ハンドラ
app.ws('/ws', (ws, req) => {
  connects.push(ws)
  console.log('New WebSocket connection established.')

  // クライアントからのメッセージを受信したときの処理
  ws.on('message', (rawMessage) => {
    try {
      const parsedMessage = JSON.parse(rawMessage)

      if (parsedMessage.type === 'chat_message') {
        // 新しいチャットメッセージの場合
        const messageId = crypto.randomUUID() // メッセージごとにユニークなIDを生成
        const { senderId, text } = parsedMessage

        const newMessage = {
          type: 'chat_message',
          messageId: messageId,
          senderId: senderId,
          text: text,
          reactions: {
            good: 0,
            bad: 0,
            excited: 0,
            interesting: 0,
            sad: 0,
          },
        }
        // サーバーのMapにメッセージを保存
        messages.set(messageId, newMessage)
        console.log(`New message from ${senderId}: ${text} (ID: ${messageId})`)

        // 全クライアントに新しいメッセージをブロードキャスト
        connects.forEach((socket) => {
          if (socket.readyState === 1) {
            socket.send(JSON.stringify(newMessage))
          }
        })
      } else if (parsedMessage.type === 'reaction') {
        // リアクションメッセージの場合
        const { messageId, reactionType } = parsedMessage
        const messageToUpdate = messages.get(messageId)

        // メッセージが存在し、リアクションタイプが有効な場合
        if (messageToUpdate && messageToUpdate.reactions.hasOwnProperty(reactionType)) {
          messageToUpdate.reactions[reactionType]++ // リアクションカウントをインクリメント
          messages.set(messageId, messageToUpdate) // 更新されたメッセージをMapに保存

          console.log(`Reaction "${reactionType}" on message ${messageId}. New count: ${messageToUpdate.reactions[reactionType]}`)

          // 全クライアントにリアクションの更新をブロードキャスト
          const updatePayload = {
            type: 'reaction_update',
            messageId: messageId,
            reactionType: reactionType,
            count: messageToUpdate.reactions[reactionType],
          }
          connects.forEach((socket) => {
            if (socket.readyState === 1) {
              socket.send(JSON.stringify(updatePayload))
            }
          })
        } else {
          console.warn(`Invalid reaction or message ID: ${messageId}, ${reactionType}`)
        }
      }
    } catch (e) {
      console.error('Failed to parse message or handle:', rawMessage, e)
    }
  })

  // WebSocket接続が閉じられたときの処理
  ws.on('close', () => {
    connects = connects.filter((conn) => conn !== ws)
    console.log('WebSocket connection closed.')
  })

  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
  }
})

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
})
