const timers = require('timers');

exports.poll = async function poll(allHostnames, hostname, dnsLookup, pingHost, sendToSubscribers) {
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
        const { subscribers } = allHostnames[hostname];
        sendToSubscribers(hostname, subscribers, error);
    }

    timers.setTimeout(poll, 1000, allHostnames, hostname, dnsLookup, pingHost, sendToSubscribers);
}
