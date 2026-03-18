import express from 'express'
import cors from 'cors'
import http from 'http'
import { Server } from 'socket.io'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/', (_req, res) => {
  res.send('API OK')
})

// Création du serveur HTTP
const server = http.createServer(app)

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
  },
})

io.on('connection', (socket) => {
  console.log('Client connecté', socket.id)

  // Rejoindre une room
  socket.on('join', ({ room, pseudo }) => {
    if (!room || !pseudo) return
    socket.join(room)
    socket.to(room).emit('system', `${pseudo} a rejoint la room`)
  })

  // Message dans une room
  socket.on('message', ({ room, pseudo, content }) => {
    if (!room || !pseudo || !content) return
    io.to(room).emit('message', { pseudo, content, timestamp: new Date().toISOString() })
  })

  // Déconnexion
  socket.on('disconnect', () => {
    console.log('Client déconnecté', socket.id)
  })
})

server.listen(PORT, () => {
  console.log(`API running on port ${PORT}`)
})