const poller = require("./poller");

exports.removeExtraHosts = function (allHostnames, hostnames, connectionId) {
    const latestHostnames = new Set(hostnames);
    Object.entries(allHostnames).filter(([hostname]) => !latestHostnames.has(hostname))
        .forEach(([hostname, { subscribers }]) => subscribers.delete(connectionId));
}

exports.handleMessage = function (allHostnames, connectionId, dnsLookup, pingHost, onSuccess, onFailure) {
    return function incoming(message) {
        try {
            const hostnames = JSON.parse(message);

            hostnames.forEach(hostname => {
                if (!(hostname in allHostnames)) {
                    allHostnames[hostname] = {
                        fails: 0,
                        subscribers: new Set()
                    };

                    poller.poll(allHostnames, hostname, dnsLookup, pingHost, onSuccess, onFailure);
                }

                allHostnames[hostname].subscribers.add(connectionId);
            });
        } catch (e) {
            console.error('expected JSON array of hostnames, received: %s', message);
        }
    };
};
