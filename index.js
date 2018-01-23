const WebSocket = require('ws');
const ping = require('net-ping');
const dns = require('dns');

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

function sendToSubscribers(hostname, problem, error) {
    const message = JSON.stringify({ hostname, problem, error });

    Array.from(allHostnames[hostname].subscribers).forEach(id => {
        const client = allClients[id];
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
        console.error(error);
    });
}

setInterval(() => {
    Object.keys(allHostnames).forEach(hostname => {
        dns.lookup(hostname, (error, address, family) => {
            if (error) {
                sendToSubscribers(hostname, 'could not resolve', error);
                return;
            }

            pingSession.pingHost(address, (error) => {
                if (error) {
                    ++allHostnames[hostname].fails;
                } else {
                    allHostnames[hostname].fails = 0;
                }

                if (allHostnames[hostname].fails >= 5) {
                    sendToSubscribers(hostname, 'ping failed', error);
                }
            });
        });
    });
}, 1000);
