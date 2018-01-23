const util = require('util');
const timers = require('timers');
const WebSocket = require('ws');
const ping = require('net-ping');
const dns = require('dns');

const wss = new WebSocket.Server({ port: 8080 });

let connectionId = 0;
const allClients = {};
const allHostnames = {};

function sendToSubscribers(hostname, error) {
    const message = JSON.stringify({ hostname, error });

    Array.from(allHostnames[hostname].subscribers).forEach(id => {
        const client = allClients[id];
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
        console.error(error);
    });
}

const dnsLookup = util.promisify(dns.lookup);
const pingSession = ping.createSession();
const pingHost = util.promisify(pingSession.pingHost.bind(pingSession));

async function poll(hostname) {
    try {
        const { address } = await dnsLookup(hostname);

        try {
            await pingHost(address);
            allHostnames[hostname].fails = 0;
        } catch (error) {
            ++allHostnames[hostname].fails;

            if (allHostnames[hostname].fails >= 5) {
                throw error;
            }
        }
    } catch (error) {
        sendToSubscribers(hostname, error);
    }

    timers.setTimeout(() => poll(hostname), 1000);
}

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

                        poll(hostname);
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
