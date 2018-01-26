const test = require("tape");
const messageHandler = require("../messageHandler");
const poller = require("../poller");

test("remove extra hosts", t => {
    const connectionId = 4;
    const allHostnames = {
        "host1": {
            subscribers: new Set([connectionId, 6])
        }
    };

    const message = [];
    messageHandler.removeExtraHosts(allHostnames, message, connectionId);

    t.false(allHostnames.host1.subscribers.has(connectionId));
    t.end();
});

test("handle message", t => {
    const connectionId = 3;
    const allHostnames = {
        "host1": {
            subscribers: new Set([8]),
            fails: 2
        }
    };

    const dnsLookup = () => ({});
    const pingHost = () => {};
    const onSuccess = () => {};
    const onFailure = () => {};
    const handle = messageHandler.handleMessage(allHostnames, connectionId, dnsLookup, pingHost, onSuccess, onFailure);

    const message = JSON.stringify(["host1", "host2"]);
    handle(message);

    t.deepEqual(allHostnames, {
        "host1": {
            subscribers: new Set([8, connectionId]),
            fails: 2
        },
        "host2": {
            subscribers: new Set([connectionId]),
            fails: 0
        }
    });
    t.end();
});

test("DNS lookup failure", t => {
    const connectionId = 0;
    const hostname = "host1";
    const allHostnames = {
        [hostname]: {
            subscribers: new Set([connectionId]),
            fails: 0
        }
    };

    const dnsLookup = () => Promise.reject(new Error());
    const pingHost = () => {};
    const onSuccess = () => {};
    let sent = false;
    const onFailure = () => {
        sent = true;
    };

    poller.poll(allHostnames, hostname, dnsLookup, pingHost, onSuccess, onFailure)
        .then(() => {
            t.assert(sent)
            t.end();
        });
});

test("one ping failure", t => {
    const connectionId = 0;
    const hostname = "host1";
    const allHostnames = {
        [hostname]: {
            subscribers: new Set([connectionId]),
            fails: 0
        }
    };

    const dnsLookup = () => ({});
    const pingHost = () => Promise.reject(new Error());
    const onSuccess = () => {};
    let sent = false;
    const onFailure = () => {
        sent = true;
    };

    poller.poll(allHostnames, hostname, dnsLookup, pingHost, onSuccess, onFailure)
        .then(() => {
            t.equal(allHostnames[hostname].fails, 1);
            t.false(sent);
            t.end();
        });
});

test("two ping failures, then success", t => {
    const connectionId = 0;
    const hostname = "host1";
    const allHostnames = {
        [hostname]: {
            subscribers: new Set([connectionId]),
            fails: 0
        }
    };

    const dnsLookup = () => ({});
    let count = 0;
    const pingHost = () => {
        if (++count === 3) return Promise.resolve();
        return Promise.reject();
    };

    let sentSuccess = false;
    const onSuccess = () => {
        sentSuccess = true;
    };

    let sentFailure = false;
    const onFailure = () => {
        sentFailure = true;
    };

    Promise.all([1, 2, 3].map(() =>
        poller.poll(allHostnames, hostname, dnsLookup, pingHost, onSuccess, onFailure)))
            .then(() => {
                t.equal(allHostnames[hostname].fails, 0);
                t.assert(sentSuccess);
                t.false(sentFailure);
                t.end();
            });
});

test("five ping failures", t => {
    const connectionId = 0;
    const hostname = "host1";
    const allHostnames = {
        [hostname]: {
            subscribers: new Set([connectionId]),
            fails: 0
        }
    };

    const dnsLookup = () => ({});
    const pingHost = () => Promise.reject(new Error());
    const onSuccess = () => {};
    let sent = false;
    const onFailure = () => {
        sent = true;
    };

    Promise.all([1, 2, 3, 4, 5].map(() =>
        poller.poll(allHostnames, hostname, dnsLookup, pingHost, onSuccess, onFailure)))
            .then(() => {
                t.equal(allHostnames[hostname].fails, 5);
                t.assert(sent);
                t.end();
            });
});
