# simple-sip-proxy

A [drachtio](https://github.com/davehorton/drachtio)-based simple load balancing sip proxy

As stated, this is a simple sip proxy that is designed to be used for scenarios where you want to distribute incoming SIP INVITE messages across a bank of application servers (e.g. freeswitch servers, or the like).  While simple, it does offer a few desirable features:

* supports configurable OPTIONS pings to detect the health of the application servers, dynamically removing and re-integrating those servers as appropriate based on their responses. 

* Simple [configuration file](config.js) can be edited while running to add or remove application servers or adjust parameters, and will immediately take affect

* Supports configurable white list of originating servers that are allowed to send INVITEs to the proxy


