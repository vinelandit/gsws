"use strict";

console.log('Websocket server');

function extractUrlValue(key, url)
{
    
    var match = url.match('[?&]' + key + '=([^&]+)');
    return match ? match[1] : null;
}

var isLocal = false;
if (!process.env.PORT) {
    isLocal = true;
}

const http = require('http');
const https = require('https');
const ws = require('ws');
const url = require('url');
const fs = require('fs');
const path = require('path');


const express = require('express');
const app = express();

var wss = null;

const playerData = {};
const playerClients = {};

var tdClient = null;

setInterval(function() {

    if(tdClient != null && playerData != {}) {
        tdClient.send(JSON.stringify(playerData));   
    }

}, 20);

if(isLocal) {

  console.log('LOCAL MODE');

  const keyfile = fs.readdirSync('./ssl/keys').filter(fn => fn.endsWith('.key'))[0];
  const certfile = fs.readdirSync('./ssl/certs').filter(fn => fn.endsWith('.crt'))[0];
  const key = fs.readFileSync('./ssl/keys/' + keyfile);
  const cert = fs.readFileSync('./ssl/certs/' + certfile);


  const sslOptions = {
    key: key,
    cert: cert
  }


  app.use('/', express.static(__dirname + '/../dist/spa/')); //  adjust
  // app.listen(303, function() { console.log('listening'); });

  const httpServer = http.createServer(app).listen(303);
  const httpsServer = https.createServer(sslOptions, app).listen(443);




  wss = new ws.WebSocketServer({ server: httpsServer });
} else {
  // remote heroku websocket server

  console.log('REMOTE MODE');

  app.use(express.static(path.join(__dirname, "./public")));
  app.get("/", (req, res) => { res.sendFile(path.join(__dirname, "index.html")) });



  const httpServer = http.createServer(app);
  wss = new ws.Server({ server: httpServer });


  const port = process.env.PORT || 3000;
  httpServer.listen(port, () => { console.log("Server started. Port: ", port); });
}



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
                              if (client !== tdClient && client.readyState === client.OPEN) {
                                client.close();
                              }
                            });
                        } else if (data.command == 'SIGTERM_ET_ALL') {
                            console.log('Received terminate command from TD');
                            for(var a in playerData) {
                                delete playerData[a];
                            }
                            for(var a in playerClients) {
                                playerClients[a].send(JSON.stringify(data));
                            }
                            wss.clients.forEach(function each(client) {
                              if (client !== tdClient && client.readyState === client.OPEN) {
                                client.close();
                              }
                            });
                        }
                        
                    }
                    
                }
                
                
            }
        } else {
            const pid = extractUrlValue('pid', req.url);
            console.log('Registering phone client ' + pid);
            playerClients['' + pid] = ws;

            // handler for messages from phones
            ws.onmessage =
            (event) =>
            {
                if(event.data != '2::' && event.data != '') { // ignore keepalive ping
                    
                    const data = JSON.parse(event.data);
                    // console.log(data);
                    if(data.pid && data.pid > 0) {

                        playerData['' + data.pid] = data;
                    }
                    
                }
                
                
            }
        }
        
        
    });




