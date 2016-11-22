/**
 * Copyright 2015 IBM Corp.
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

 RED.dnr = (function() {
     var constraints = [];

    function init() {
      $('<li><span class="deploy-button-group button-group">'+
        '<a id="btn-constraints" class="deploy-button disabled" href="#"> <span>'+RED._("deploy.createConstraints")+'</span></a>'+
        '<a id="btn-constraints-options" data-toggle="dropdown" class="deploy-button" href="#"><i class="fa fa-caret-down"></i></a>'+
        '</span></li>').prependTo(".header-toolbar");

      $('#btn-constraints').click(function() { $( "#node-dialog-new-constraints" ).dialog( "open" ); });

      $("#node-dialog-new-constraints").dialog({
        title:"Define new constraint",
        modal: true,
        autoOpen: false,
        width: 500,
        open: function(e) {
            // RED.keyboard.disable();
        },
        close: function(e) {
            // RED.keyboard.enable();
        },
        buttons: 
        {
            "Create": newConstraintDialog,
            Cancel: function() {
                $( this ).dialog( "close" );
            }
        }
      });

      $("#node-dialog-flow-metadata").dialog({
        title:"Configure metadata of this flow",
        autoOpen: false,
        modal: true,
        width: 500,
        open: function(e) {
            // RED.keyboard.disable();
        },
        close: function(e) {
            // RED.keyboard.enable();
        },
        buttons: 
        {
            "Create": newFlowMetadataDialog,
            Cancel: function() {
                $( this ).dialog( "close" );
            }
        }
      });

      RED.menu.init({id:"btn-constraints-options",
        options: []
      });

      var constraintMenu = {
          id:"menu-item-constraints",
          toggle:true,
          selected: true,
          label:RED._("menu.label.displayConstraints"),
          onselect:function(s) { toggleConstraints(s)}
        };

      RED.menu.addItem("menu-item-view-menu", constraintMenu);

      var flowMenu = {
          id:"menu-item-flows",
          label:"Metadata",
          onselect:function(s) { showFlowMetadata(s)}
        };

      RED.menu.addItem("menu-item-workspace", flowMenu);
    }

    function toggleConstraints(checked) {
      RED.view.constraints(checked);
    }

    function showFlowMetadata(){
      var thisFlowId = RED.workspaces.active();

      $( "#flow-id" ).val(thisFlowId);
      $( "#flow-trackers" ).val('');

      RED.nodes.eachWorkspace(function(flow){
        if (flow.id === thisFlowId && flow.metadata)
          $( "#flow-trackers" ).val(flow.metadata.trackers.toString());
      });

      $( "#node-dialog-flow-metadata" ).dialog( "open" ); 
    }


    function newFlowMetadataDialog(){
      var flowId = $( "#flow-id" ).val();
      var trackers = $( "#flow-trackers" ).val().split(',');

      // parsing trackers into array of http://host:port
      
      var flowMetadata = {};

      if (trackers){
        flowMetadata['trackers'] = trackers;
        RED.nodes.eachWorkspace(function(flow){
          console.log(flow);
          if (flow.id === flowId)
            flow['metadata'] = flowMetadata;
        });
      }

      $( this ).dialog( "close" );
    }

    function newConstraintDialog(){
      var constraintId = $( "#constraint-id" ).val();
      if (!constraintId){
          alert('constrantId is required');
          return;
      }
          
      var deviceId = $( "#device-id" ).val();
      var geoloc = $( "#geoloc-constraint" ).val();
      var network = $( "#network-constraint" ).val();
      var compute = $( "#compute-constraint" ).val();
      var storage = $( "#storage-constraint" ).val();
      var custom = $( "#custom-constraint" ).val();
      
      var creatingConstraint = {
        id:constraintId
      };  
      if (deviceId)
          creatingConstraint['deviceId'] = deviceId;
      if (geoloc)
          creatingConstraint['geoloc'] = geoloc;
      if (network)
          creatingConstraint['network'] = network;
      if (compute)
          creatingConstraint['compute'] = compute;
      if (storage)
          creatingConstraint['storage'] = storage;
      if (custom)
          creatingConstraint['custom'] = custom;

      // add it to the top down box
      addConstraint(creatingConstraint);

      $( this ).dialog( "close" );
    }

    function testConstraints(){
      var c = {
        id: 'Location in Vancouver',
        loc: '143.23232, -93.232233'
      };
      var c2 = {
        id: 'Location in Burnaby',
        loc: '143.267732, -93.996868'
      };

      addConstraint(c);
      addConstraint(c2);

      applyingConstraint(getConstraint(c));
      applyingConstraint(getConstraint(c2));
    }

    function addConstraint(c){
      if (getConstraint(c)){
        // alert("Constraint name duplicated");
        return;
      }

      var newConstraintOption = {
        id:c.id,
        // toggle:"deploy-type",
        // icon:"red/images/deploy-full.png",
        label:c.id,
        // sublabel:RED._("deploy.fullDesc"),
        // selected: true, 
        onselect:function(s) { applyingConstraint(c)}
      };

      RED.menu.addItem("btn-constraints-options", newConstraintOption);

      // add it to the constraints list
      c.fill = c.fill ? c.fill : getRandomColor();
      c.text = c.text ? c.text : c.id;
      constraints.push(c);
    }

    /** 
     * Applying a constraint to selected nodes
     * Constraints and Nodes are Many to Many relationship
     * @param {constraint} c - The constraint being applyed to 
     */
    function applyingConstraint(c){
      if (!getConstraint(c))
        return;

      var appliedTo = 0;

      // TODO: either bind constraint to nodes
      RED.nodes.eachNode(function(node){
        if (!node.selected)
          return;

        if (!node['constraints'])
          node['constraints'] = {};

        if (node.constraints[c.id])
          return;

        node.constraints[c.id] = c;
        appliedTo++;
      });

      // or nodes to constraint, choose one!
      // RED.nodes.eachNode(function(node){
      //   if (!node.selected)
      //     return;

      //   if (!c['nodes'])
      //     c['nodes'] = [];

      //   for (var i = 0; i < c.nodes.length; i++){
      //     if (c.nodes[i] === node.id)
      //       return;
      //   }

      //   c.nodes.push(node.id);
      // });

      if (appliedTo)
        RED.notify(c.id + " applied to "  + appliedTo + " selected nodes", "info");

      RED.nodes.dirty(true);
    }

    function getRandomColor(){
      var possibleColor = ["#4286f4", "#f404e0", "#f40440", "#f42404", 
            "#f4a804", "#2d9906", "#069959", "#068c99", "#8f0699",
            "#5103c6", "#c66803", "#c64325", "#c425c6", "#7625c6", "#c62543",
            "#25c6a1", "#187f67", "#407266", "#567240", "#bf3338", "#bf337b"];

      var result = possibleColor[Math.ceil(Math.random() * possibleColor.length) - 1];

      return result;
    }

    function removeConstraint(c) {
      for (var i = 0; i < constraints.length; i++){
          if ((c.id && c.id === constraints[i].id) || c === constraints[i].id)
              constraints.splice(i, 1);
      }
    }
    function getConstraint(c){
      for (var i = 0; i < constraints.length; i++){
          if ((c.id && c.id === constraints[i].id) || c === constraints[i].id)
              return constraints[i];
      }  
      return null;
    }
    function allConstraint(){
      return JSON.parse(JSON.stringify(constraints));
    }
    function append_constraints(node){
      var constraints = node.append("svg:g").attr("class","node_constraints_group").style("display","none");
    }

    function redraw_constraints(d, thisNode, showConstraints){
      var node_constraints_group = thisNode.selectAll('.node_constraints_group');
      var node_constraints_list = thisNode.selectAll('.node_constraint');

      if (!showConstraints || !d.constraints) {
        node_constraints_group.style("display","none");
        return;
      }

      node_constraints_group.style("display","inline");

      var nodeConstraints = [];

      // TODO: what if not using d.constraints?
      // loop throuth constraints list, in each constraint, find the list of nodes
      // check if there is any matched node with thisNode (d.id) in such constraint
      // add such constraint to the array

      // for (var i = 0; i < constraints.length; i++){
      //   var cNodes = constraints[i].nodes;
      //   if (!cNodes)
      //     continue;

      //   for (var j = 0; j < cNodes.length; j++){
      //     if (cNodes[j].id === d.id)
      //       nodeConstraints.push(constraints[i]);
      //   }
      // }

      // TODO: choose this or the above algor, or use both two data structure,
      // NOTE: d.constraints might not be available when constraints list is loaded from the server!
      // --> the above is safer, but much slower
      for (c in d.constraints){
        if (!d.constraints.hasOwnProperty(c))
          continue;

        nodeConstraints.push(d.constraints[c]);
      }

      // TODO: weak check on array matching, should check with constraint id (data) and text label (view)
      if (node_constraints_list[0].length === nodeConstraints.length)
        return;

      // create new nodes with a fresh start (avoid mix and match)
      node_constraints_list.remove();

      node_constraints_group
        .attr("transform","translate(3, -" + nodeConstraints.length * 12 + ")")
        .style({"font-style": "italic", "font-size": 12});

      for (var j = 0; j < nodeConstraints.length; j++){

        var constraintData = nodeConstraints[j];
        var fill = constraintData.fill || "black";
        // var shape = constraintData.shape;

        var node_constraint = node_constraints_group.append("svg:g");
        var makeCallback = function(id, node_constraint){
          return function(){
            delete d.constraints[id];
            node_constraint.remove();
            RED.nodes.dirty(true);
          }
        };
        node_constraint.style({fill: fill, stroke: fill})
          .attr("class","node_constraint")
          .attr("transform","translate(0, " + j*17 + ")")
          .on("click", makeCallback(constraintData.id, node_constraint));

        // node_constraint.append("rect")
        //   .attr("class","node_constraint_icon")
        //   .attr("x",0).attr("y",0)
        //   .attr("width",9).attr("height",9);

        node_constraint.append("svg:text")
          .attr("class","node_constraint_label")
          .text(constraintData.text ? constraintData.text : "");
      } 
    }

    function prepareConstraints(n, node){
      if (n.constraints)
        node['constraints'] = n.constraints;
    }

    function loadConstraints(nodes){
      for (var i = 0; i < nodes.length; i++){
        if (!nodes[i]['constraints'])
          continue;

        var nConstraints = nodes[i].constraints;
        for (c in nConstraints){
          if (nConstraints.hasOwnProperty(c))
            addConstraint(nConstraints[c]);
        }
      }
    }

    return {
       addConstraint: addConstraint,
       removeConstraint: removeConstraint,
       getConstraint: getConstraint,
       allConstraint: allConstraint,
       appendConstraints: append_constraints,
       redrawConstraints: redraw_constraints,
       prepareConstraints: prepareConstraints,
       loadConstraints: loadConstraints,
       init: init
    }
 })();
