const express = require("express");
const http = require("http");
const ws = require("ws");
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "./public")));
app.get("/", (req, res) => { res.sendFile(path.join(__dirname, "index.html")) });

console.log('hello');

const commandList = {
    fromClient: {
        
        movePaddle: [
            'speed'
        ],
        submitInitials: [
            'initials'
        ],
        clearClients: [
        ]
    },
    fromMaster: {
        grantGame: [
            'playerID'
        ],
        livesLeft: [
            'lives'
        ]
    }
}


const validate = function(data) {
    var valid = true;
    data = JSON.parse(data);
    // console.log('validating', data);
    if(!data.to) valid = false;
    const senderType = data.to == 'master' ? 'fromClient' : 'fromMaster';
    if(!commandList[senderType][data.command]) valid = false;

    if(senderType == 'fromClient' && data.to !== 'master') valid = false;
    // if(senderType == 'fromMaster' && data.to == 'master') valid = false;

    // console.log('valid', valid);
    return valid;
   
}

var master = null; // will contain touch designer websocket client
var clients = {};
const times = {}; 
var deadClients = {};

const preroll = 5; // seconds before play

const httpServer = http.createServer(app);
const wss = new ws.Server({ server: httpServer });
wss.on("connection",
    (ws, req) =>
    {
        console.log("Client connected");
        if(req.url.indexOf('TOUCHDESIGNER')>-1) {
            console.log('Registering Touchdesigner client');
            master = ws;
        } else {
            const re = /\?pid\=(\d+)/;
            const pidm = req.url.match(re);
            if(pidm.length) {
                
           
            
                const pID = pidm[1];
                var grantedPID = pID;

                if(!clients['player' + pID]) {
                    clients['player' + pID] = ws;
                    times['player' + pID] = {
                        'start': Date.now()
                    };
                } else {
                    // slot is already occupied!
                    grantedPID = -1;
                }

                ws.send(JSON.stringify({
                    
                    command: 'grantGame',
                    payload: {
                        playerID: grantedPID 
                    },
                    to: grantedPID,
                    from: 'master'
                }));

                master.send(JSON.stringify({
                    
                    command: 'joinGame',
                    payload: {
                        playerID: grantedPID
                    },
                    to: 'master',
                    from: 'server'
                    
                }));

                if(grantedPID == -1) {
                    // kill connection after sending denied message
                    setTimeout(function(){
                        ws.close();
                    }, 1000);
                }

            } else {
                // missing player ID
                ws.close();
            }
        }

        ws.onmessage =
            (event) =>
            {
                if(event.data != '2::') { // ignore keepalive ping
                    
                    if(validate(event.data)) {
                        const data = JSON.parse(event.data);
                        if(data.to == 'master') {
                            const i = 'player'+data.from;

                            if(data.command == 'submitInitials') {
                                // add lifetime to data, submit initials, close connection
                                data.payload.lifetime = Math.round(((times[i].end - times[i].start) / 1000) - preroll);
                                event.data = JSON.stringify(data);
                                if(deadClients[i]) {
                                    deadClients[i].close();
                                    delete deadClients[i];
                                }
                            }
                            if(data.command == 'clearClients') {
                                console.log('clearing clients');
                                for(var j in clients) {
                                    clients[j].close;
                                    delete clients[j];
                                }
                                for(var j in deadClients) {
                                    deadClients[j].close;
                                    delete deadClients[j];
                                }

                            } else {
                                // console.log('sending', event.data);
                                master.send(event.data);
                            }
                        } else {
                            const i = 'player'+data.to;
                            if(clients[i]) {
                                clients[i].send(event.data);
                                if(data.command == 'livesLeft' && data.payload.lives <= 0) {
                                    // game over, move client to dead clients list
                                    deadClients[i] = clients[i];
                                    times[i].end = Date.now();
                                    delete clients[i];

                                }
                            }


                        }

                    }
                }
                
                
            }
        
    });

const port = process.env.PORT || 3000;
httpServer.listen(port, () => { console.log("Server started. Port: ", port); });
