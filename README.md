# simple-sip-proxy

A [drachtio](https://github.com/davehorton/drachtio)-based load balancing sip proxy

This is a simple sip proxy that is designed to be used for scenarios where you want to distribute incoming SIP INVITE messages across a bank of application servers; for example, to load balance calls across multiple freeswitch servers or the like.  While simple, it does offer a few desirable features:

* supports configurable OPTIONS pings to detect the health of the application servers, dynamically removing and re-integrating those servers as appropriate based on their responses. 

* Simple [configuration file](config.js.example) can be edited while running to add or remove application servers or adjust parameters, and will immediately take affect

* Supports configurable white list of originating servers that are allowed to send INVITEs to the proxy

Currently, the proxy only handles INVITE messages, though it would be trivial to add support for REGISTER or other messages that would be useful in an access environment.

## Installing

You will first need to install [drachtio-server](https://github.com/davehorton/drachtio-server) on the server (or on another server on your network).  After that (and presuming [node.js](https://nodejs.org) is installed on your server, do the following:

````bash
git clone https://github.com/davehorton/simple-sip-proxy.git
cd simple-sip-proxy
npm install
cp config.js.example config.js
# edit config.js as appropriate for your environment
node app.js
````

