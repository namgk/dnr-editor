# Distributed Node-RED (DNR) Editor

Node-RED is a visual tool for wiring the Internet of Things.  The Distributed Node-RED (DNR) project extends Node-RED to support flows that can be distributed between devices. 

DNR Editor is a Node-RED flows editor modified to support design of distributed flows. Once new flows are deployed, rather than the flows being started, a notification is published to all participating Node RED instances about new flows available. 

Participating Node RED instances (with node-red-contrib-dnr installed) get notified and pull the new flows. DNR-Daemon node parses the flows based on flows constraints and redeploy the DNR-ized flows onto local Node-RED instance on which it run. This project is work in progress.

[![Distributed Node-RED](https://snag.gy/Hq1A4d.jpg)](#features)

The idea of DNR:

* every device has a capability/property definition such as storage, memory or geographic location.
* a Node-RED node can be configured so that it only run on certain devices by defining one or more constraints assocciate to it. The constraints will be matched against the device's capability/property definition.
* if a node is not to be run on a device due to the device not meeting the required constraints, messages that are sent to it will be intercepted and finally dropped, or redirected to an external Node RED instance. 
* mechanism for all participating devices to download the distributed flow from a 'DNR Operator' (where run dnr-editor) such as a cloud server.

For more information on our initial ideas, see these [presentation](http://www.slideshare.net/MichaelBlackstock/wo-t-2014-blackstock-2), [presentation](http://www.slideshare.net/namnhong/developing-io-t-applications-in-the-fog-a-distributed-dataflow-approach) and assocated [paper](http://www.webofthings.org/wp-content/uploads/2009/07/wot20140_submission_1.pdf), [paper](https://www.researchgate.net/publication/290435774_Developing_IoT_Applications_in_the_Fog_a_Distributed_Dataflow_Approach). 

An initial version of DNR is also available at <https://github.com/mblackstock/node-red-contrib/> and at <https://github.com/namgk/distributed-node-red> where a single installation of modified Node-RED run on participating devices. In order to reduce the effort required to augment the vanilla Node-RED as well as to allow users to use vanilla Node-RED instead of an augmented one, a special node is created called DNR-Daemon (node-red-contrib-dnr) which downloads, converts DNR flows into flows that vanilla Node-RED can understand, and install them to the local vanilla Node RED where it run.

## Quick Start

1. git clone
2. cd node-red
3. npm install
4. grunt build
5. node red
6. Open <http://localhost:1818> (note the port used)
7. Design DNR flows.

An example of DNR flows:

```json
[{"id":"b9579282.b5df7","type":"inject","z":"bda77274.01523","name":"","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"x":224,"y":286,"wires":[["68d99328.0a307c"]],"constraints":{"link":{"0_68c538d9.e3eb08":"N1"}}},{"id":"68d99328.0a307c","type":"function","z":"bda77274.01523","name":"demo","func":"\nreturn msg;","outputs":"2","noerr":0,"x":336,"y":368,"wires":[["fb7529ad.1bb348"],[]],"constraints":{"link":{"0_68c538d9.e3eb08":"11","1_eb1ce14f.29c99":"1N"},"In Vancouver, BC":{"id":"In Vancouver, BC","fill":"#25c6a1","text":"In Vancouver, BC"}}},{"id":"fb7529ad.1bb348","type":"debug","z":"bda77274.01523","name":"","active":true,"console":"false","complete":"false","x":500,"y":314,"wires":[]}]
```

Once the flows are deployed, a notification will be published to participating Node RED instances via DNR-Daemon nodes.

## Support
Documentation on vanilla Node-RED can be found [here](http://nodered.org/docs/).

For support or questions related to DNR, please contact [@mblackstock](http://twitter.com/mblackstock) or Nam Giang at <kyng@ece.ubc.ca>.

## Original Node-RED

Node-RED is a project of the [JS Foundation](http://js.foundation).

It was created by [IBM Emerging Technology](https://www.ibm.com/blogs/emerging-technology/).

* Nick O'Leary [@knolleary](http://twitter.com/knolleary)
* Dave Conway-Jones [@ceejay](http://twitter.com/ceejay)


DNR is an extension of Node-RED by Mike Blackstock [@mblackstock](http://twitter.com/mblackstock) and Nam Giang <kyng@ece.ubc.ca>
