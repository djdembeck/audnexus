import { fastify } from 'fastify'
import showBook from './config/routes/books/show'
import deleteBook from './config/routes/books/delete'
import showChapter from './config/routes/books/chapters/show'
import { connect } from './config/papr'

// Heroku or local port
const Port = process.env.PORT || 3000
const host = '0.0.0.0'
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1'
const server = fastify({
    logger: {
        level: 'warn'
    }
})

server.register(showBook)
server.register(showChapter)
server.register(deleteBook)
server.register(require('fastify-redis'), { url: REDIS_URL })

server.listen(Port, host, async (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    await connect()
    console.log(`Server listening at ${address}`)
})
