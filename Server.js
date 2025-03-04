import app from "./App/app.js"
import http from "http"
import { initializeWebSocket } from "./Websocket/Socket.js"



const PORT = 2009

const server = http.createServer(app)

initializeWebSocket(server)

server.listen(PORT,(err)=>{
    err?console.log(err):console.log(`server is connected on ${PORT}`)
})