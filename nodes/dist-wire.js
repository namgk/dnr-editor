/**
 * Copyright 2014 Sense Tecnic Systems, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var util = require("util");
var redUtil = require("../red/util");

module.exports = function(RED) {
    "use strict";
    // we hard code the broker used for device distribution.  Could move this to settings
    
    var MQTT_PREFIX = "wire/";
    var MQTT_HOST = "test.mosquitto.org";
    var MQTT_PORT = "1883";
    var MQTT_CLIENTID = redUtil.generateId();
    var MQTT_USERNAME = "";
    var MQTT_PASSWORD = "";

    var MQTT_BROKER_CONFIG = {
            "broker":"test.mosquitto.org",
            "port":1883,
            "clientid":"sdf",
            "username":"",
            "password":""
        };

    var connectionPool = require("./core/io/lib/mqttConnectionPool");

    function DNRNode(n){
        RED.nodes.createNode(this,n);

        var me = this;

        me.client = connectionPool.get(
            MQTT_HOST, 
            MQTT_PORT, 
            MQTT_CLIENTID, 
            MQTT_USERNAME, 
            MQTT_PASSWORD);

        //TODO: find a proper way to handle node status
        me.client.connect();

        console.log('DEBUG: DNRNode created for node\n' + JSON.stringify(n));

        // Listen to: MQTT_PREFIX/n.id-outwire
        var outWires = n.wires;
        for (var i = 0; i< outWires.length; i++){
            var brokerTopic = MQTT_PREFIX + n.id + '-' + outWires[i];
            console.log('DEBUG: DNRNode subscribing to: ' + brokerTopic);
            me.client.subscribe(brokerTopic,
                2,
                function(topic,payload,qos,retain) {
                    var msg = JSON.parse(payload);
                    console.log('DEBUG: DNRNode got message from broker: \n' + payload);
                    me.send(msg);
                }
           );
        }

        // Publish to MQTT_PREFIX/msg_origin-n.id
        me.on("input", function(msg){
            if (!msg)
                return;

            if (!msg._origin){
                console.log('CRITICAL DNR ERROR: cannot determine topic for publishing msg to broker');
                console.log('msg dropped!');
                return;
            }

            var dnrMsg = {
                payload: JSON.stringify(msg),
                topic: MQTT_PREFIX + msg._origin + '-' + n.id
            };

            console.log('DEBUG: DNRNode send message to broker: \n' + JSON.stringify(dnrMsg));
            me.client.publish(dnrMsg);
        })

        me.on('close', function() {
            if (me.client) {
                me.client.disconnect();
            }
        });
    }

    RED.nodes.registerType("dnr",DNRNode);

    function WireInNode(n) {
        RED.nodes.createNode(this,n);

        this.topic = MQTT_PREFIX+n.topic;  // wire/{id}-{output}-{id}
        this.broker = MQTT_BROKER_CONFIG.broker;
        this.brokerConfig = MQTT_BROKER_CONFIG;
        util.log('WireInNode created. topic:'+this.topic);

        if (this.brokerConfig) {
            this.status({fill:"red",shape:"ring",text:"disconnected"});
            this.client = connectionPool.get(this.brokerConfig.broker,this.brokerConfig.port,RED.settings.deviceId+'wirein',this.brokerConfig.username,this.brokerConfig.password);
            var node = this;
            this.client.subscribe(this.topic,2,function(topic,payload,qos,retain) {
                    console.log('WIREIN NODE ' + node.id + ' RECEIVED ' + payload);
                    var msg = {topic:topic,payload:''+payload,qos:qos,retain:retain};
                    if ((node.brokerConfig.broker == "localhost")||(node.brokerConfig.broker == "127.0.0.1")) {
                        msg._topic = topic;
                    }
                    node.send(msg);
            });
            this.client.on("connectionlost",function() {
                node.status({fill:"red",shape:"ring",text:"disconnected"});
            });
            this.client.on("connect",function() {
                node.status({fill:"green",shape:"dot",text:"connected"});
            });
            this.client.connect();
        } else {
            this.error("missing broker configuration");
        }
        this.on('close', function() {
            if (this.client) {
                this.client.disconnect();
            }
        });
    }
    RED.nodes.registerType("wire in",WireInNode);

    function WireOutNode(n) {
        RED.nodes.createNode(this,n);

        this.topic = MQTT_PREFIX+n.topic;  // wire/{id}
        this.broker = MQTT_BROKER_CONFIG.broker;
        this.brokerConfig = MQTT_BROKER_CONFIG;
        util.log('WireOutNode created. topic:'+this.topic);

        if (this.brokerConfig) {
            this.status({fill:"red",shape:"ring",text:"disconnected"},true);
            this.client = connectionPool.get(this.brokerConfig.broker,this.brokerConfig.port,RED.settings.deviceId+'wireout',this.brokerConfig.username,this.brokerConfig.password);
            var node = this;
            this.on("input",function(msg) {
                console.log('WIREOUT NODE ' + node.id + ' RECEIVED ' + msg);
                if (msg != null) {
                    if (node.topic) {
                        msg.topic = node.topic;
                    }
                    this.client.publish(msg);
                }
            });
            this.client.on("connectionlost",function() {
                node.status({fill:"red",shape:"ring",text:"disconnected"});
            });
            this.client.on("connect",function() {
                node.status({fill:"green",shape:"dot",text:"connected"});
            });
            this.client.connect();
        } else {
            this.error("missing broker configuration");
        }
        this.on('close', function() {
            if (this.client) {
                this.client.disconnect();
            }
        });
    }
    RED.nodes.registerType("wire out",WireOutNode);

}
