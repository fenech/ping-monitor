# Ping monitor tool

A websocket server that pings a list of hosts that the client subscribes to.

Messages are sent to all subscribed clients if the host cannot be reached 5 times.

**N.B. this process must be run as root**
