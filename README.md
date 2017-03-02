# Distributed Node-RED (DNR) Editor

Node-RED is a visual tool for wiring the Internet of Things.  The Distributed Node-RED (DNR) project extends Node-RED to support flows that can be distributed between devices. DNR works with a cluster of vanilla Node-RED devices and a Node-RED Coordinator called DNR Editor, a modified version of Node-RED. 

Overall architecture:
[![Distributed Node-RED](https://snag.gy/vdQ2jn.jpg)](#features)

DNR Editor is a Node-RED flows editor modified to support design of distributed flows. Once new flows are deployed, they are not started but distributed to participating Node RED instances in the cluster and deployed there.

To connect a Node RED instance to a DNR cluster, install node-red-contrib-dnr node on the instance and follow the registration process in the quick start section bellow.

Node-red-contrib-dnr module consists of a special node called DNR Daemon node, which acts as a local agent that connect the local Node-RED instance to the DNR cluster. DNR-Daemon node gets the DNR flows from DNR Editor, transforms it to a compatible Node-RED flow and deploys the "dnr-ized" flow to the local Node-RED instance . 

This is a research project funded by NSERC that aims at designing a distributed application platform for the Internet of Things and Fog Computing.

A sample DNR flow that runs on several Raspberry Pis and a Cloud server:

![Sample DNR Flow](https://snag.gy/W0LzZb.jpg)

The idea of DNR:

* every device has a capability/property definition such as storage, memory or geographic location.
* a Node-RED node can be configured so that it only run on certain devices by defining one or more constraints assocciate to it. The constraints will be matched against the device's capability/property definition.
* if a node is not to be run on a device due to the device not meeting the required constraints, messages that are sent to it will be intercepted and finally dropped, or redirected to an external Node RED instance. 
* mechanism for all participating devices to download the distributed flow from a 'DNR Operator' (where run dnr-editor) such as a cloud server.

For more information on our initial ideas, see these [presentation](http://www.slideshare.net/MichaelBlackstock/wo-t-2014-blackstock-2), [presentation](http://www.slideshare.net/namnhong/developing-io-t-applications-in-the-fog-a-distributed-dataflow-approach) and assocated [paper](http://www.webofthings.org/wp-content/uploads/2009/07/wot20140_submission_1.pdf), [paper](https://www.researchgate.net/publication/290435774_Developing_IoT_Applications_in_the_Fog_a_Distributed_Dataflow_Approach). 

An initial version of DNR is also available at <https://github.com/mblackstock/node-red-contrib/> and at <https://github.com/namgk/distributed-node-red> where a single installation of modified Node-RED run on participating devices. In order to reduce the effort required to augment the vanilla Node-RED as well as to allow users to use vanilla Node-RED instead of an augmented one, a special node is created called DNR-Daemon (node-red-contrib-dnr) which downloads, converts DNR flows into flows that vanilla Node-RED can understand, and install them to the local vanilla Node RED where it run.

## Quick Start

Requirements: several Raspberry Pi (participating Node-RED, just for fun, could be multiple instances of Node-RED in a single machine); a computer to run DNR Editor (the coordinator)

### Setup DNR Editor 
Similar to Node-RED: git clone, npm install, grunt build, and start by "node red"

DNR Editor will run by default at :1818 port.

### Connect Node RED to the cluster:
1. For each Node RED instance, install *node-red-contrib-dnr* nodes: either using GUI->Menu->Manage Pallete->Install or go to ~/.node-red and do *npm install node-red-contrib-dnr*
2. Getting the *Seed flow*: go to DNR Editor at http://localhost:1818, GUI->Menu->DNR->Export DNR Seed->Export to clipboard
3. Import the *Seed flow* on each participating Node RED: GUI->Import->Clipboard->Paste(CMD/CTRL V)->Import
4. Configure the imported *Seed flow*: configure the DNR Editor's target (so that the daemon can connect to) and local Node RED's informration (credentials if local Node RED is password protected, device's name, and possibly location)
5. Deploy the *Seed flow*: click Deploy.

After this, these connected devices can be seen on the Device Monitor on DNR Editor: GUI->Menu->DNR->Show devices

Device monitor

![DNR Device Monitor](https://snag.gy/a9VbUA.jpg)

### Sample flow
A minimal sample DNR flow:

![Minimal DNR Flow](https://snag.gy/6ZhjnK.jpg)

Code:
```json
[{"id":"733a9ff3.9c766","type":"tab","label":"Flow 1"},{"id":"9d59c9cc.b67158","type":"inject","z":"733a9ff3.9c766","name":"","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"x":188.95140075683594,"y":86.97222900390625,"wires":[["b5a1fcec.5b0c4"]],"constraints":{"on my mac":{"id":"on my mac","deviceName":"nam-mba","fill":"#f404e0","text":"on my mac"}}},{"id":"b5a1fcec.5b0c4","type":"debug","z":"733a9ff3.9c766","name":"","active":true,"console":"false","complete":"false","x":401.2812042236328,"y":125.0625,"wires":[],"constraints":{"pi17":{"id":"pi17","deviceName":"pi17","fill":"#5103c6","text":"pi17"}}}]
```

## Support
Documentation on vanilla Node-RED can be found [here](http://nodered.org/docs/).

More tutorials on wiki page.

For support or questions related to DNR, please contact [@mblackstock](http://twitter.com/mblackstock) or Nam Giang at <kyng@ece.ubc.ca>.

## Original Node-RED

Node-RED is a project of the [JS Foundation](http://js.foundation).

It was created by [IBM Emerging Technology](https://www.ibm.com/blogs/emerging-technology/).

* Nick O'Leary [@knolleary](http://twitter.com/knolleary)
* Dave Conway-Jones [@ceejay](http://twitter.com/ceejay)


DNR Editor is an extension of Node-RED inspired by Mike Blackstock [@mblackstock](http://twitter.com/mblackstock) and created by Nam Giang <kyng@ece.ubc.ca>
