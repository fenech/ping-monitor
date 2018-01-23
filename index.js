const WebSocket = require('ws');
const ping = require('net-ping');

const wss = new WebSocket.Server({ port: 8080 });

let connectionId = 0;
const allClients = {};
const allHostnames = {};

function addMessageHandler(client, connectionId) {
    client.on('message', function incoming(message) {
        try {
            const hostnames = JSON.parse(message);
            if (Array.isArray(hostnames)) {
                hostnames.forEach(hostname => {
                    if (!(hostname in allHostnames)) {
                        allHostnames[hostname] = {
                            fails: 0,
                            subscribers: new Set()
                        };
                    }

                    allHostnames[hostname].subscribers.add(connectionId);
                })
            }
        } catch (e) {
            console.error('expected JSON array of hostnames, received: %s', message);
        }
    });
}

wss.on('connection', function connection(ws) {
    allClients[connectionId] = ws;
    addMessageHandler(ws, connectionId);
    ++connectionId;
});

const pingSession = ping.createSession();

setInterval(() =>
    Object.keys(allHostnames).forEach(hostname =>
        pingSession.pingHost(hostname, (error) => {
            if (error) {
                ++allHostnames[hostname].fails;
            } else {
                allHostnames[hostname].fails = 0;
            }

            if (allHostnames[hostname].fails >= 5) {
                const message = JSON.stringify({
                    hostname,
                    status: 'down'
                });

                Array.from(allHostnames[hostname].subscribers).forEach(id => {
                    const client = allClients[id];
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(message);
                    }
                });
                console.log(message);
            }
        })), 1000);
