# Distributed Node-RED (DNR)

Node-RED is a visual tool for wiring the Internet of Things.  The Distributed Node-RED (DNR) project extends Node-RED to support flows that can be distributed between devices.  This code is work in progress.

[![Distributed Node-RED](https://github.com/namgk/node-red/raw/master/dnr.png)](#features)

The idea of DNR:

* every device has a capability/property definition such as storage, memory or geographic location.
* a Node-RED node can be configured so that it only run on certain devices by defining one or more constraints assocciate to it. The constraints will be matched against the device's capability/property definition.
* if a node is not to be run on a device due to the device not meeting the required constraints, such node will be replaced to a special node called DNRNode. DNRNode forwards the messages back and forth between the device where this node run and the current device.
* mechanism for all participating devices to download the distributed flow from a 'master' device such as a cloud server.

For more information on our initial ideas, see these [presentation](http://www.slideshare.net/MichaelBlackstock/wo-t-2014-blackstock-2), [presentation](http://www.slideshare.net/namnhong/developing-io-t-applications-in-the-fog-a-distributed-dataflow-approach) and assocated [paper](http://www.webofthings.org/wp-content/uploads/2009/07/wot20140_submission_1.pdf), [paper](https://www.researchgate.net/publication/290435774_Developing_IoT_Applications_in_the_Fog_a_Distributed_Dataflow_Approach). 

An initial version of DNR is also available at <https://github.com/mblackstock/node-red-contrib/>.

Watch this space for more information on how to configure and run the system.

## Quick Start

Installing on an individual device (laptop, server, raspberry-pis) is the same as standard Node-RED.

Check out <http://nodered.org> for full instructions on getting started with Node-RED.

1. git clone
2. cd node-red
3. npm install
4. grunt build
5. node red
6. Open <http://localhost:1880>

### Testing with two processes in one device (e.g laptop)
Clone the code into two different directories, such as node-red-1880 and node-red-1881. 

Modify settings.js in node-red-1881 to differentiate these two processes:
```bash
cd node-red-1881
vi settings.js
```
* set the port to 1881
* set the deviceId to 1881
* set the userDir (uncomment) to another directory other than the default, e.g /home/nol/.node-red2

Modify dnr.test for testing purpose: 
```bash
echo "1881" > dnr.test
```

Start node-red-1880. Go to the editor at <http://localhost:1880> and select Import > Clipboard from the menu at the top right conner. Paste the following example flow and click ok. The example flow read content from a file and output it to the Debug node. The idea is to demonstrate how a File In node is run on different device that read files on that device, not the current running device.

```json
[{
    "id": "d707b1e0.28f85",
    "type": "inject",
    "z": "ad35591f.52caa8",
    "name": "",
    "topic": "",
    "payload": "",
    "payloadType": "date",
    "repeat": "",
    "crontab": "",
    "once": false,
    "x": 159,
    "y": 98,
    "wires": [
        ["6e701f2e.918fe"]
    ],
    "constraints": {
        "run on device 1880": {
            "id": "run on device 1880",
            "deviceId": "1880",
            "fill": "#ad98d6",
            "text": "run on device 1880"
        }
    }
}, {
    "id": "6e701f2e.918fe",
    "type": "file in",
    "z": "ad35591f.52caa8",
    "name": "",
    "filename": "dnr.test",
    "format": "utf8",
    "x": 262,
    "y": 206,
    "wires": [
        ["4f480e35.b0b7f"]
    ],
    "constraints": {
        "run on device 1881": {
            "id": "run on device 1881",
            "deviceId": "1881",
            "fill": "#c46170",
            "text": "run on device 1881"
        }
    }
}, {
    "id": "4f480e35.b0b7f",
    "type": "debug",
    "z": "ad35591f.52caa8",
    "name": "",
    "active": true,
    "console": "false",
    "complete": "false",
    "x": 497,
    "y": 128,
    "wires": [],
    "constraints": {
        "run on device 1880": {
            "id": "run on device 1880",
            "deviceId": "1880",
            "fill": "#ad98d6",
            "text": "run on device 1880"
        }
    }
}]
```

Click on Deploy button to run this flow on node-red-1880. If you click on the Inject trigger, there will be no output on the Debug console because the node File isn't being run on the current device.

After this, a new flow file will be created on the default location as configured in the settings.js. For example, /home/user/.node-red/flow_...local.json

Copy this file to /home/user/.node-red2 for the second DNR process.

Next, start node-red-1881
```bash
cd ..
cd node-red-1881
node red
```

Now test triggering the Inject node.
* trigger the Inject nodes in either <http://localhost:1880> or <http://localhost:1881>, "1881" shows up on the Debug console of device 1880
* the Debug console in <http://localhost:1881> does not show anything

This is because the File In node is run on the device 1881 and read the dnr.test file in that device (whose content is "1881") instead of in device 1880. On the other hand, the Debug node is constrained to run on device 1880 so that the Debug console on <http://localhost:1881> won't be showing anything.

## Support
Documentation on vanilla Node-RED can be found [here](http://nodered.org/docs/).

For support or questions related to DNR, please contact [@mblackstock](http://twitter.com/mblackstock) or Nam Giang at <kyng@ece.ubc.ca>.

## Browser Support

The Node-RED editor runs in the browser. We routinely develop and test using
Chrome and Firefox. We have anecdotal evidence that it works in IE9.

We do not yet support mobile browsers, although that is high on our priority
list.

## Original Node-RED

Node-RED is a creation of [IBM Emerging Technology](http://ibm.com/blogs/et).

* Nick O'Leary [@knolleary](http://twitter.com/knolleary)
* Dave Conway-Jones [@ceejay](http://twitter.com/ceejay)

For more open-source projects from IBM, head over [here](http://ibm.github.io).

DNR is an extension of Node-RED by Mike Blackstock [@mblackstock](http://twitter.com/mblackstock) and Nam Giang <kyng@ece.ubc.ca>

## Copyright and license

Copyright 2013, 2014 IBM Corp. under [the Apache 2.0 license](LICENSE).
