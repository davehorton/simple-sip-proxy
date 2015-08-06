# simple-sip-proxy

A [drachtio](https://github.com/davehorton/drachtio)-based load balancing sip proxy

This is a simple sip proxy that is designed to be used for scenarios where you want to distribute incoming SIP INVITE messages across a bank of application servers; for example, to load balance calls across multiple freeswitch servers or the like.  While simple, it does offer a few desirable features:

* supports configurable OPTIONS pings to detect the health of the application servers, dynamically removing and re-integrating those servers as appropriate based on their responses. 

* Simple [configuration file](config.js) can be edited while running to add or remove application servers or adjust parameters, and will immediately take affect

* Supports configurable white list of originating servers that are allowed to send INVITEs to the proxy

Currently, the proxy only handles INVITE messages, though it would be trivial to add support for REGISTER or other messages that would be useful in an access environment.

