const express = require("express");
const http = require("http");
const ws = require("ws");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "./public")));
app.get("/", (req, res) => { res.sendFile(path.join(__dirname, "index.html")) });

console.log('hello');

var tdClient = null;

var lastMessage;

const playerData = {};

const httpServer = http.createServer(app);
const wss = new ws.Server({ server: httpServer });

setInterval(function() {

    if(tdClient != null && playerData != {}) {
        tdClient.send(JSON.stringify(playerData));   
    }

}, 20);


wss.on("connection",
    (ws, req) =>
    {
        console.log("Client connected");
        if(req.url.indexOf('TOUCHDESIGNER')>-1) {
            console.log('Registering TD client');
            tdClient = ws;

            // handler for messages from TD
            ws.onmessage =
            (event) =>
            {
                if(event.data != '2::' && event.data != '') { // ignore keepalive ping
                    
                    const data = JSON.parse(event.data);
                    if(data.command) {
                        
                        if(data.command == 'reset') {
                        
                            console.log('Received reset command from TD');
                            for(var a in playerData) {
                                delete playerData[a];
                            }
                            wss.clients.forEach(function each(client) {
                              if (client !== ws && client.readyState === WebSocket.OPEN) {
                                client.close();
                              }
                            });
                        }
                        
                    }
                    
                }
                
                
            }
        } else {
            console.log('Registering phone client');

            // handler for messages from phones
            ws.onmessage =
            (event) =>
            {
                if(event.data != '2::' && event.data != '') { // ignore keepalive ping
                    
                    const data = JSON.parse(event.data);
                    console.log(data);
                    if(data.pid && data.pid > 0) {

                        playerData['' + data.pid] = data;
                    }
                    
                }
                
                
            }
        }
        
        
    });

const port = process.env.PORT || 3000;
httpServer.listen(port, () => { console.log("Server started. Port: ", port); });
