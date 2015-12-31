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

RED.deployspec = (function() {

  var deploymentTypes = {
    "full":{img:"red/images/deploy-full-o.png"},
    "nodes":{img:"red/images/deploy-nodes-o.png"},
    "flows":{img:"red/images/deploy-flows-o.png"}
  }

  var ignoreDeployWarnings = {
    unknown: false,
    unusedConfig: false,
    invalid: false
  }

  var deploymentType = "full";

  function changeDeploymentType(type) {
    deploymentType = type;
    $("#btn-deploy img").attr("src",deploymentTypes[type].img);
  }


  /**
   * options:
   *   type: "default" - Button with drop-down options - no further customisation available
   *   type: "simple"  - Button without dropdown. Customisations:
   *    label: the text to display - default: "Deploy"
   *    icon : the icon to use. Null removes the icon. default: "red/images/deploy-full-o.png"
   */
  function init(options) {
    options = options || {};
    var type = options.type || "default";

    if (type == "default") {
      $('<li><span class="deploy-button-group button-group">'+
        '<a id="btn-constraints" class="deploy-button disabled" href="#"> <span>'+RED._("deploy.createConstraints")+'</span></a>'+
        '<a id="btn-constraints-options" data-toggle="dropdown" class="deploy-button" href="#"><i class="fa fa-caret-down"></i></a>'+
        '</span></li>').prependTo(".header-toolbar");
      RED.menu.init({id:"btn-constraints-options",
        options: []
      });
    } else if (type == "simple") {
      var label = options.label || RED._("deploy.createConstraints");
      // var icon = 'red/images/deploy-full-o.png';
      // if (options.hasOwnProperty('icon')) {
      //   icon = options.icon;
      // }

      $('<li><span class="deploy-button-group button-group">'+
        '<a id="btn-constraints" class="deploy-button disabled" href="#">'+
        // (icon?'<img id="btn-deploy-icon" src="'+icon+'"> ':'')+
        '<span>'+label+'</span></a>'+
        '</span></li>').prependTo(".header-toolbar");
    }

    $('#btn-constraints').click(function() { $( "#node-dialog-new-constraints" ).dialog( "open" ); });

    $("#node-dialog-new-constraints").dialog({
      title:"Define new constraint",
      autoOpen: false,
      width: 500,
      open: function(e) {
          RED.keyboard.disable();
      },
      close: function(e) {
          RED.keyboard.enable();
      },
      buttons: 
      {
          "Create": newConstraint,
          Cancel: function() {
              $( this ).dialog( "close" );
          }
      }
    });

    // RED.events.on('nodes:change',function(state) {
    //   if (state.dirty) {
    //     window.onbeforeunload = function() {
    //       return RED._("deploy.confirm.undeployedChanges");
    //     }
    //     $("#btn-deploy").removeClass("disabled");
    //   } else {
    //     window.onbeforeunload = null;
    //     $("#btn-deploy").addClass("disabled");
    //   }
    // });
  }

  function newConstraint(){
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

  function addConstraint(c){
    /* sample menu item:
        {
          id:"deploymenu-item-full",
          toggle:"deploy-type",
          icon:"red/images/deploy-full.png",
          label:RED._("deploy.full"),
          sublabel:RED._("deploy.fullDesc"),
          selected: true, 
          onselect:function(s) { }
        }
    */
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
    RED.dnr.addConstraint(c);
  }

  function applyingConstraint(c){
    // RED.dnr.setActiveConstraint(c);
    // RED.view.state(RED.state.CONSTRAINT);
    // if (!confirm('applying constraint ' + c.id + ' to the selected node(s)?'))
    //   return;
    var applied = false;

    var activeWorkspace = RED.workspaces.active();
    activeNodes = RED.nodes.filterNodes({z:activeWorkspace});
    activeNodes.forEach(function(node){
      // console.log(JSON.stringify(node));
      if (node.selected){
        if (!node['constraints'])
          node['constraints'] = {};

        node.constraints[c.id] = c;
        applied = true;
      }
    });

    if (applied)
      RED.notify("Constraint applied to selected nodes", "info");
  }

  function getNodeInfo(node) {
    var tabLabel = "";
    if (node.z) {
      var tab = RED.nodes.workspace(node.z);
      if (!tab) {
        tab = RED.nodes.subflow(node.z);
        tabLabel = tab.name;
      } else {
        tabLabel = tab.label;
      }
    }
    var label = "";
    if (typeof node._def.label == "function") {
      label = node._def.label.call(node);
    } else {
      label = node._def.label;
    }
    label = label || node.id;
    return {tab:tabLabel,type:node.type,label:label};
  }
  function sortNodeInfo(A,B) {
    if (A.tab < B.tab) { return -1;}
    if (A.tab > B.tab) { return 1;}
    if (A.type < B.type) { return -1;}
    if (A.type > B.type) { return 1;}
    if (A.name < B.name) { return -1;}
    if (A.name > B.name) { return 1;}
    return 0;
  }

  return {
    init: init
  }
})();
