const util = require('util');
const WebSocket = require('ws');
const ping = require('net-ping');
const pingSession = ping.createSession();
const pingHost = util.promisify(pingSession.pingHost.bind(pingSession));
const dns = require('dns');
const dnsLookup = util.promisify(dns.lookup);
const messageHandler = require('./messageHandler');

const wss = new WebSocket.Server({ port: 8080 });

let connectionId = 0;
const allClients = {};
const allHostnames = {};

function sendToSubscribers(subscribers, message) {
    Array.from(subscribers).forEach(id => {
        const client = allClients[id];
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function onSuccess(hostname, subscribers) {
    const message = JSON.stringify({ hostname, status: "up" });
    sendToSubscribers(subscribers, message);
}

function onFailure(hostname, subscribers, error) {
    const message = JSON.stringify({ hostname, status: "down", error });
    sendToSubscribers(subscribers, message);
}

wss.on('connection', function connection(ws) {
    allClients[connectionId] = ws;
    ws.on('message', messageHandler.handleMessage(allHostnames, connectionId, dnsLookup, pingHost, onSuccess, onFailure));
    ++connectionId;
});
