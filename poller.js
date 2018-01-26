const timers = require('timers');

exports.poll = async function poll(allHostnames, hostname, dnsLookup, pingHost, onSuccess, onFailure) {
    const { subscribers } = allHostnames[hostname];

    try {
        const { address } = await dnsLookup(hostname);

        try {
            await pingHost(address);
            allHostnames[hostname].fails = 0;
            onSuccess(hostname, subscribers);
        } catch (error) {
            ++allHostnames[hostname].fails;

            if (allHostnames[hostname].fails >= 5) {
                throw error;
            }
        }
    } catch (error) {
        onFailure(hostname, subscribers, error);
    }

    timers.setTimeout(poll, 1000, allHostnames, hostname, dnsLookup, pingHost, onSuccess, onFailure);
};
