# Distributed Node-RED (DNR) Editor

Node-RED is a visual tool for wiring the Internet of Things.  The Distributed Node-RED (DNR) project extends Node-RED to support flows that can be distributed between devices. DNR Editor is a Node-RED flows editor modified to support design of distributed flows. Once new flows are deployed, rather than the flows being started, a notification is published into an MQTT broker to notify all participating DNR devices about new flows available. 

Participating DNR devices (with DNR-Daemon installed) get notified and pull the new flows. DNR-Daemon parses the flows based on flows constraints and redeploy the DNR-parsed flows onto vanilla Node-RED which is installed on the same machine with DNR-Daemon. This code is work in progress.

[![Distributed Node-RED](https://github.com/namgk/node-red/raw/master/dnr.png)](#features)

The idea of DNR:

* every device has a capability/property definition such as storage, memory or geographic location.
* a Node-RED node can be configured so that it only run on certain devices by defining one or more constraints assocciate to it. The constraints will be matched against the device's capability/property definition.
* if a node is not to be run on a device due to the device not meeting the required constraints, such node will be replaced to a special node called DNRNode. DNRNode forwards the messages back and forth between the device where this node run and the current device.
* mechanism for all participating devices to download the distributed flow from a 'master' device (where run dnr-editor) such as a cloud server.

For more information on our initial ideas, see these [presentation](http://www.slideshare.net/MichaelBlackstock/wo-t-2014-blackstock-2), [presentation](http://www.slideshare.net/namnhong/developing-io-t-applications-in-the-fog-a-distributed-dataflow-approach) and assocated [paper](http://www.webofthings.org/wp-content/uploads/2009/07/wot20140_submission_1.pdf), [paper](https://www.researchgate.net/publication/290435774_Developing_IoT_Applications_in_the_Fog_a_Distributed_Dataflow_Approach). 

An initial version of DNR is also available at <https://github.com/mblackstock/node-red-contrib/> and at <https://github.com/namgk/distributed-node-red> where a single installation of modified Node-RED run on participating devices. In order to reduce the effort required to augment the vanilla Node-RED as well as to allow users to use vanilla Node-RED instead of an augmented one, a separate process is created called DNR-Daemon which download and converts DNR flows into flows that vanilla Node-RED can understand.

Watch this space for more information on how to configure and run the system.

## Quick Start

Installing on an individual device (laptop, server, raspberry-pis) is the same as standard Node-RED.

Check out <http://nodered.org> for full instructions on getting started with Node-RED.

1. git clone
2. cd node-red
3. npm install
4. grunt build
5. node red
6. Open <http://localhost:1818> (note the port used)
7. Design DNR flows.

An example of DNR flows:

```json
[{"id":"226b1255.dd94ee","type":"inject","z":"fa6c7449.059388","name":"","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"x":104,"y":45,"wires":[["533f07e9.acc0f8"]]},{"id":"533f07e9.acc0f8","type":"file in","z":"fa6c7449.059388","name":"","filename":"dnr.test","format":"utf8","x":246,"y":123,"wires":[["9fbc541f.6043a8","41aef548.be510c"]],"constraints":{"1880":{"deviceId":"1880","fill":"#f7dbe4","id":"1880","text":"1880"},"1881":{"id":"1881","deviceId":"1881","fill":"#c46170","text":"1881"}}},{"id":"9fbc541f.6043a8","type":"debug","z":"fa6c7449.059388","name":"","active":true,"console":"false","complete":"false","x":439,"y":89,"wires":[],"constraints":{"1881":{"id":"1881","deviceId":"1881","fill":"#c46170","text":"1881"}}},{"id":"41aef548.be510c","type":"debug","z":"fa6c7449.059388","name":"","active":true,"console":"false","complete":"false","x":436.5,"y":173,"wires":[],"constraints":{"1880":{"deviceId":"1880","fill":"#f7dbe4","id":"1880","text":"1880"}}}]
```

Once the flows are deployed, an MQTT notification will be published with the url where participating DNR-Daemon can download the new flows.

## Support
Documentation on vanilla Node-RED can be found [here](http://nodered.org/docs/).

For support or questions related to DNR, please contact [@mblackstock](http://twitter.com/mblackstock) or Nam Giang at <kyng@ece.ubc.ca>.

## Browser Support

The Node-RED editor runs in the browser. We routinely develop and test using
Chrome and Firefox. We have anecdotal evidence that it works in IE9.

We do not yet support mobile browsers, although that is high on our priority
list.

## Original Node-RED

Node-RED is a creation of [IBM Emerging Technology](https://www.ibm.com/blogs/emerging-technology/).

* Nick O'Leary [@knolleary](http://twitter.com/knolleary)
* Dave Conway-Jones [@ceejay](http://twitter.com/ceejay)

For more open-source projects from IBM, head over [here](http://ibm.github.io).

DNR is an extension of Node-RED by Mike Blackstock [@mblackstock](http://twitter.com/mblackstock) and Nam Giang <kyng@ece.ubc.ca>

## Copyright and license

Copyright 2013, 2016 IBM Corp. under [the Apache 2.0 license](LICENSE).
