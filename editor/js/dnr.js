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
    var linkConstraints = {};

    // location constraints GUI
    function mapInit(){
      var VANCOUVER = {lat: 49.269801, lng: -123.109489}
      var currentOverlay = null
      var overlayVisible = false

      var map = new google.maps.Map(document.getElementById('map'), {
        center: VANCOUVER, 
        zoom: 13
      })

      var drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.MARKER,
        drawingControl: true,
        drawingControlOptions: {
          position: google.maps.ControlPosition.TOP_CENTER,
          drawingModes: ['rectangle']
        }
      })

      drawingManager.setMap(map)

      google.maps.event.addListener(map, 'click', function(event) {
        clearOverlay()
      });

      google.maps.event.addListener(drawingManager, 'overlaycomplete', function(e) {
        clearOverlay()
        currentOverlay = e.overlay
        overlayVisible = true
      })

      $('#location-constraint').click(function() { 
        $( "#node-dialog-map" ).dialog( "open" )
        if (overlayVisible){
          map.setCenter({
            lat: currentOverlay.getBounds().getCenter().lat(), 
            lng: currentOverlay.getBounds().getCenter().lng()})
        } else {
          map.setCenter(VANCOUVER)
        }
        
        google.maps.event.trigger(map, 'resize') // to make map visible
        drawingManager.setDrawingMode(google.maps.drawing.OverlayType.RECTANGLE)
      });

      $("#node-dialog-map").dialog({
        title:"Set location constraint",
        modal: true,
        autoOpen: false,
        width: 500,
        open: function(e) {},
        close: function(e) {},
        buttons: 
        {
          Set: function (){
            if (!overlayVisible){
              $( '#location-constraint' ).val("")
              $( this ).dialog( "close" );
              return
            }

            var bounds = currentOverlay.getBounds();
            var start = bounds.getNorthEast();
            var end = bounds.getSouthWest();

            $( '#location-constraint' ).val( 
              JSON.stringify({
                ne: [start.lat(), start.lng()],
                sw: [end.lat(), end.lng()]
            }));
            $( this ).dialog( "close" );
          },
          Reset: function(){
            clearOverlay()
          },
          Cancel: function() {
            $( this ).dialog( "close" );
          }
        }
      })

      function clearOverlay(){
        if (currentOverlay){
          currentOverlay.setMap(null)
          overlayVisible = false
        }
      }
    }

    function init() {
      mapInit()
      RED.sidebar.devices.init()
      RED.sidebar.show('devices')

      $('<li><span class="deploy-button-group button-group">'+
        '<a id="btn-constraints" class="deploy-button" href="#"> <span>Node Requirements</span></a>'+
        '<a id="btn-constraints-options" data-toggle="dropdown" class="deploy-button" href="#"><i class="fa fa-caret-down"></i></a>'+
        '</span></li>').prependTo(".header-toolbar");

      $('#btn-constraints').click(function() { 
        $( "#node-dialog-new-constraints" ).dialog( "open" ) })

      $("#node-dialog-new-constraints").dialog({
        modal: true,
        autoOpen: false,
        width: 500,
        open: function(e) {
            var constraintId = $('#constraint-id').val()
            if (!constraintId){
              $(this).dialog('option', 'title', 'Create a node requirement');
              $("#createConstraintBtn").text('Create')
              return
            }

            // editing existing constraint
            for (var i = 0; i < constraints.length; i++){
              if (constraints[i].id === constraintId){
                var c = constraints[i]
              }
            }

            if (!c){
              return
            }

            if (c['deviceId']){
              $( "#device-id" ).val(c['deviceId'])
            }
            if (c['location']){
              $( "#location-constraint" ).val(c['location'])
            }
            if (c['memory']){
              $( "#memory-constraint" ).val(c['memory'])
            }
            if (c['cores']){
              $( "#cores-constraint" ).val(c['cores'])
            }
            $(this).dialog('option', 'title', 'Editing existed constraint');
            $("#createConstraintBtn").text('Save edit')
        },
        close: function(e) {
          // reset on close
          resetConstraintsDialog()
        },

        buttons: 
        {
          "Create": {
            id: "createConstraintBtn",
            click: createConstraint
          },
          Cancel: function() {
            $( this ).dialog( "close" );
          }
        }
      });

      var seed_dialog = 
        '<div id="seed-dialog" class="hide node-red-dialog">'+
        '<form class="dialog-form form-horizontal">'+
          '<div class="form-row">'+
            '<textarea readonly style="resize: none; width: 100%; border-radius: 4px;font-family: monospace; font-size: 12px; background:#f3f3f3; padding-left: 0.5em; box-sizing:border-box;" id="seed-export" rows="5"></textarea>'+
          '</div>'+
        '</form></div>'

      $(seed_dialog)
      .appendTo("body")
      .dialog({
        title: 'Export DNR Seed',
        modal: true,
        autoOpen: false,
        width: 500,
        resizable: false,
        buttons: [
          {
            id: "clipboard-dialog-cancel",
            text: RED._("common.label.cancel"),
            click: function() {
              $( this ).dialog( "close" );
            }
          },
          {
            id: "clipboard-dialog-copy",
            class: "primary",
            text: RED._("clipboard.export.copy"),
            click: function() {
              $("#seed-export").select();
              document.execCommand("copy");
              document.getSelection().removeAllRanges();
              RED.notify(RED._("clipboard.nodesExported"));
              $( this ).dialog( "close" );
            }
          }
        ],
        open: function(e) {
            $(this).parent().find(".ui-dialog-titlebar-close").hide();
        },
        close: function(e) {
        }
      });

      RED.menu.init({id:"btn-constraints-options",
        options: []
      });

      /* link constraints */ 
      $('<li><span class="deploy-button-group button-group">'+
        '<a id="btn-link-constraints" data-toggle="dropdown" class="deploy-button" href="#">'+
        'Link Requirements ' + 
        '<i class="fa fa-caret-down"></i></a>'+
        '</span></li>').prependTo(".header-toolbar");

      RED.menu.init({id:"btn-link-constraints",
          options: [
              {id:"1-1",label:'1-1',onselect:function(){setLinkConstraint('11')}},
              {id:"1-N",label:'1-N',onselect:function(){setLinkConstraint('1N')}},
              {id:"N-1",label:'N-1',onselect:function(){setLinkConstraint('N1')}},
              {id:"N-N",label:'N-N',onselect:function(){setLinkConstraint('NN')}}
          ]
      });

      // toggle button to show/hide constraints
      // RED.menu.addItem("menu-item-view-menu", );
      // RED.menu.addItem("menu-item-view-menu", );
      RED.menu.addItem("btn-sidemenu", {
        id:"menu-item-dnr",
        toggle:false,
        // selected: true,
        label: 'DNR',
        options: [
          {
            id:"menu-item-constraints",
            toggle:true,
            selected: true,
            label: 'Show constraints',
            onselect:function(s) { toggleConstraints(s)}
          },
          {
            id:"menu-item-dnr-seed",
            toggle:false,
            // selected: true,
            label: 'Show dnr seed',
            onselect:function() { showDnrSeed()}
          },
          {
            id:"menu-item-dnr-devices",
            toggle:false,
            // selected: true,
            label: 'Show devices',
            onselect:"dnr:show-devices-tab"
          }
        ]
      });

      RED.events.on("deploy",flowDeployed);
    }// end init

    function resetConstraintsDialog(){
      $( "#constraint-id" ).val("")
      $( "#device-id" ).val("")
      $( "#location-constraint" ).val("")
      $( "#memory-constraint" ).val("")
      $( "#cores-constraint" ).val("")
    }

    function showDnrSeed(){
      var host = document.location.hostname;
      var port = document.location.port;
      var protocol = document.location.protocol

      var operatorUrl = protocol + "//" + host + (port ? (":"+port) : "")
      var dnrSeed = [
        {
          "id": "af25fe8d.debf5",
          "type": "tab",
          "label": "DNR Seed"
        },
        {
          "id":"f14195aa.25e298",
          "operatorUrl": operatorUrl,
          "type": "dnr-daemon",
          "x":100,"y":100,
          "z": "af25fe8d.debf5"
        }
      ]
      $("#seed-export").val(JSON.stringify(dnrSeed))
      $( "#seed-dialog" ).dialog( "open" )
    }

    function toggleConstraints(checked) {
      d3.selectAll('.node_constraints_group').style("display", checked ? "inline" : "none")
      d3.selectAll('.link_constraint_group').style("display", checked ? "inline" : "none")
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

    function createConstraint(){
      var constraintId = $( "#constraint-id" ).val();
      if (!constraintId){
          alert('constrantId is required');
          return;
      }
          
      var deviceId = $( "#device-id" ).val();
      var location = $( "#location-constraint" ).val();
      var memory = $( "#memory-constraint" ).val();
      var cores = $( "#cores-constraint" ).val();
      // var network = $( "#network-constraint" ).val();
      // var custom = $( "#custom-constraint" ).val();
      
      var creatingConstraint = {
        id:constraintId
      };  
      if (deviceId)
          creatingConstraint['deviceId'] = deviceId;
      if (location)
          creatingConstraint['location'] = location;
      if (memory)
          creatingConstraint['memory'] = memory;
      if (cores)
          creatingConstraint['cores'] = cores;

      addConstraintToGui(creatingConstraint);

      $( this ).dialog( "close" );
    }

    // add a constraint to constraint drowdown list
    function addConstraintToGui(c){
      // check if c id is unique (exist or not)
      for (var i = 0; i < constraints.length; i++){
        if (c.id && c.id === constraints[i].id){
          // updating existing constraint
          constraints[i] = c
          return
        }
      }  

      // add it to the constraints list
      c.fill = c.fill ? c.fill : randomColor();
      c.text = c.text ? c.text : c.id;
      constraints.push(c);

      RED.menu.addItem("btn-constraints-options", {
        id:c.id,
        label:c.id,
        onselect:function(s) { 
          var nodeSelected = false

          RED.nodes.eachNode(function(node){
            if (node.selected){
              nodeSelected = true
              return
            }
          })

          if (!nodeSelected){
            // no node is selected, allow to edit current constraint


            $( "#constraint-id" ).val(c['id'])

            $( "#node-dialog-new-constraints" ).dialog( "open" )
          } else {
            // reset these fields to blank
            resetConstraintsDialog()
            setNodeConstraint(c)
          }
        }
      });

    }

    /* Link constraints */

    /** 
     * Applying a link type to selected link
     * Now the nodes' constraints do not only contain the node's constraints
     // but also the type of its links on its two ends (inputs and outputs)
     * @param {linkType} wt - The link type being applyed to 
     */
    function setLinkConstraint(linkType){
      var link = d3.select('.link_selected')
      if (link.data().length > 1){
        console.log('WARNING, choosing 2 links at the same time!!!')
        return;
      }
      if (!link.data()[0]){
        return
      }

      var d = link.data()[0]

      var source = d.source
      var sourcePort = d.sourcePort
      var target = d.target
      var midX = (d.x1+d.x2) / 2
      var midY = (d.y1+d.y2) / 2

      linkConstraints[source.id + '_' + sourcePort + '_' + target.id] = linkType

      link.selectAll('.link_constraint_group').remove();
      link.append("svg:g")
        .style({display:'inline',fill: 'brown', 'font-size': 12})
        .attr("class","link_constraint_group")
        .attr("transform","translate(" + midX + "," + midY+ ")")
        .append("svg:text")
        .text(linkType)
        .on("click", (function(){
          return function(){
            link.selectAll('.link_constraint_group').remove();
            delete linkConstraints[source.id + 
                        '_' + sourcePort + '_' + target.id]
            RED.nodes.dirty(true);
          }
        })())

      RED.nodes.dirty(true);// enabling deploy
    }

    // called when editor is initiated 
    function appendLinkConstraint(link){
      var d = link.data()[0]
      
      var source = d.source
      var sourcePort = d.sourcePort
      var target = d.target
      var midX = (d.x1+d.x2) / 2 || 0
      var midY = (d.y1+d.y2) / 2 || 0

      var sourceLink, linkType

      try {
        sourceLink = source.constraints.link
        linkType = sourceLink[sourcePort + '_' + target.id]
        // clear the node's constraint for editor
        delete sourceLink[sourcePort + '_' + target.id]
        // set the temporary constraints store
        linkConstraints[source.id + '_' + sourcePort + '_' + target.id] = linkType
      } catch(e){}
      
      if (!linkType){
        return
      }

      link.selectAll('.link_constraint_group').remove();
      link.append("svg:g")
        .style({display:'inline',fill: 'brown', 'font-size': 12})
        .attr("class","link_constraint_group")
        .attr("transform","translate(" + midX + "," + midY+ ")")
        .append("svg:text")
        .text(linkType)
        .on("click", (function(){
          return function(){
            link.selectAll('.link_constraint_group').remove();
            // delete sourceLink[sourcePort + '_' + target.id]
            delete linkConstraints[source.id + 
                        '_' + sourcePort + '_' + target.id]
            RED.nodes.dirty(true);
          }
        })())
    }

    // on deploy
    function addLinkConstraintsToData(data){
      var flows = data.flows
      for (var o in flows){
        var obj = flows[o]

        if (!obj.wires){
          continue
        }

        for (var i = 0; i< obj.wires.length; i++){
          for (var j = 0; j < obj.wires[i].length; j++){
            if (!obj.wires[i][j]){
              continue
            }

            var link = obj.id + '_' + i + '_' + obj.wires[i][j]
            var linkType = linkConstraints[link]
            if (!linkType){
              continue
            }

            if (!obj.constraints){
              obj.constraints = {}
            }

            if (!obj.constraints.link){
              obj.constraints.link = {}
            }

            obj.constraints.link[i + '_' + obj.wires[i][j]] = linkType
          }
        }
      }

    }

    function flowDeployed(){
      $.ajax({
        url: "dnr/flows/"+RED.workspaces.active(),
        type:"POST",
        success: function(resp) {
        },
        error: function(jqXHR,textStatus,errorThrown) {
          console.log('cannot notify new flow')  
        }
      });
    }

    /*
      called whenever a node is moved, to update the location of label
      according to the location of link
      TODO: only redraw the link that moves
    */
    function redrawLinkConstraint(l){
      if (l.attr('class').indexOf('link_background') === -1){
        return
      }

      var aLink = d3.select(l[0][0].parentNode).selectAll('.link_constraint_group')
      if (!aLink.data()[0]){
        return
      }

      var d = aLink.data()[0]
      var midX = (d.x1+d.x2) / 2
      var midY = (d.y1+d.y2) / 2

      aLink.attr("transform","translate(" + midX + "," + midY+ ")")
    }

    /** 
     * Applying a constraint to selected nodes, it will be shown on redrawing, after
     * clicking on the canvas
     * Constraints and Nodes are Many to Many relationship
     * @param {constraint} c - The constraint being applyed to 
     */
    function setNodeConstraint(c){
      var appliedTo = 0;

      // TODO: either bind constraint to nodes
      RED.nodes.eachNode(function(node){
        if (!node.selected){
          return;
        }

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

    // n: d3 data object, node: node JSON object
    function prepareConstraints(n, node){
      if (n.constraints)
        node['constraints'] = n.constraints;
    }

    // when server starts, load constraints to constraints list 
    function loadConstraints(nodes){
      for (var i = 0; i < nodes.length; i++){
        if (!nodes[i]['constraints'])
          continue;

        var nConstraints = nodes[i].constraints;
        for (c in nConstraints){
          if (c !== 'link'){
            addConstraintToGui(nConstraints[c]);
          }
        }
      }
    }

    function randomColor(){
      var possibleColor = ["#4286f4", "#f404e0", "#f40440", "#f42404", 
            "#f4a804", "#2d9906", "#069959", "#068c99", "#8f0699",
            "#5103c6", "#c66803", "#c64325", "#c425c6", "#7625c6", "#c62543",
            "#25c6a1", "#187f67", "#407266", "#567240", "#bf3338", "#bf337b"];

      var result = possibleColor[Math.ceil(Math.random() * possibleColor.length) - 1];

      return result;
    }

   
    function append_constraints(node){
      var constraints = node.append("svg:g").attr("class","node_constraints_group").style("display","none");
    }

    function redraw_constraints(d, thisNode, showConstraints){
      var node_constraints_group = thisNode.selectAll('.node_constraints_group');
      var node_constraints_list = thisNode.selectAll('.node_constraint');

      // if (!showConstraints || !d.constraints) {
      //   node_constraints_group.style("display","none");
      //   return;
      // }

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

    return {
       addLinkConstraintsToData: addLinkConstraintsToData,
       appendLinkConstraint: appendLinkConstraint,
       redrawLinkConstraint: redrawLinkConstraint,
       prepareConstraints: prepareConstraints,
       loadConstraints: loadConstraints,
       appendConstraints: append_constraints,
       redrawConstraints: redraw_constraints,
       init: init
    }
 })();











RED.sidebar.devices = (function() {


    var content = document.createElement("div");
    content.className = "sidebar-node-config";

    $('<div class="button-group sidebar-header">'+
      '<a class="sidebar-header-button-toggle selected" id="workspace-config-node-filter-all" href="#"><span data-i18n="sidebar.config.filterAll"></span></a>'+
      '<a class="sidebar-header-button-toggle" id="workspace-config-node-filter-unused" href="#"><span data-i18n="sidebar.config.filterUnused"></span></a> '+
      '</div>'
    ).appendTo(content);


    var toolbar = $('<div>'+
        '<a class="sidebar-footer-button" id="workspace-config-node-collapse-all" href="#"><i class="fa fa-angle-double-up"></i></a> '+
        '<a class="sidebar-footer-button" id="workspace-config-node-expand-all" href="#"><i class="fa fa-angle-double-down"></i></a>'+
        '</div>');

    var globalCategories = $("<div>").appendTo(content);
    var flowCategories = $("<div>").appendTo(content);
    var subflowCategories = $("<div>").appendTo(content);

    var showUnusedOnly = false;

    var categories = {};

    function getOrCreateCategory(name,parent,label) {
        name = name.replace(/\./i,"-");
        if (!categories[name]) {
            var container = $('<div class="palette-category workspace-config-node-category" id="workspace-config-node-category-'+name+'"></div>').appendTo(parent);
            var header = $('<div class="workspace-config-node-tray-header palette-header"><i class="fa fa-angle-down expanded"></i></div>').appendTo(container);
            if (label) {
                $('<span class="config-node-label"/>').text(label).appendTo(header);
            } else {
                $('<span class="config-node-label" data-i18n="sidebar.config.'+name+'">').appendTo(header);
            }
            $('<span class="config-node-filter-info"></span>').appendTo(header);
            category = $('<ul class="palette-content config-node-list"></ul>').appendTo(container);
            container.i18n();
            var icon = header.find("i");
            var result = {
                label: label,
                list: category,
                size: function() {
                    return result.list.find("li:not(.config_node_none)").length
                },
                open: function(snap) {
                    if (!icon.hasClass("expanded")) {
                        icon.addClass("expanded");
                        if (snap) {
                            result.list.show();
                        } else {
                            result.list.slideDown();
                        }
                    }
                },
                close: function(snap) {
                    if (icon.hasClass("expanded")) {
                        icon.removeClass("expanded");
                        if (snap) {
                            result.list.hide();
                        } else {
                            result.list.slideUp();
                        }
                    }
                },
                isOpen: function() {
                    return icon.hasClass("expanded");
                }
            };

            header.on('click', function(e) {
                if (result.isOpen()) {
                    result.close();
                } else {
                    result.open();
                }
            });
            categories[name] = result;
        } else {
            if (categories[name].label !== label) {
                categories[name].list.parent().find('.config-node-label').text(label);
                categories[name].label = label;
            }
        }
        return categories[name];
    }

    function createConfigNodeList(id,nodes) {
        var category = getOrCreateCategory(id.replace(/\./i,"-"))
        var list = category.list;

        nodes.sort(function(A,B) {
            if (A.type < B.type) { return -1;}
            if (A.type > B.type) { return 1;}
            return 0;
        });
        if (showUnusedOnly) {
            var hiddenCount = nodes.length;
            nodes = nodes.filter(function(n) {
                return n._def.hasUsers!==false && n.users.length === 0;
            })
            hiddenCount = hiddenCount - nodes.length;
            if (hiddenCount > 0) {
                list.parent().find('.config-node-filter-info').text(RED._('sidebar.config.filtered',{count:hiddenCount})).show();
            } else {
                list.parent().find('.config-node-filter-info').hide();
            }
        } else {
            list.parent().find('.config-node-filter-info').hide();
        }
        list.empty();
        if (nodes.length === 0) {
            $('<li class="config_node_none" data-i18n="sidebar.config.none">NONE</li>').i18n().appendTo(list);
            category.close(true);
        } else {
            var currentType = "";
            nodes.forEach(function(node) {
                var label = "";
                if (typeof node._def.label == "function") {
                    try {
                        label = node._def.label.call(node);
                    } catch(err) {
                        console.log("Definition error: "+node._def.type+".label",err);
                        label = node._def.type;
                    }

                } else {
                    label = node._def.label;
                }
                label = label || node.id;
                if (node.type != currentType) {
                    $('<li class="config_node_type">'+node.type+'</li>').appendTo(list);
                    currentType = node.type;
                }

                var entry = $('<li class="palette_node config_node palette_node_id_'+node.id.replace(/\./g,"-")+'"></li>').appendTo(list);
                $('<div class="palette_label"></div>').text(label).appendTo(entry);
                if (node._def.hasUsers !== false) {
                    var iconContainer = $('<div/>',{class:"palette_icon_container  palette_icon_container_right"}).text(node.users.length).appendTo(entry);
                    if (node.users.length === 0) {
                        entry.addClass("config_node_unused");
                    }
                }
                entry.on('click',function(e) {
                    RED.sidebar.info.refresh(node);
                });
                entry.on('dblclick',function(e) {
                    RED.editor.editConfig("", node.type, node.id);
                });
                var userArray = node.users.map(function(n) { return n.id });
                entry.on('mouseover',function(e) {
                    RED.nodes.eachNode(function(node) {
                        if( userArray.indexOf(node.id) != -1) {
                            node.highlighted = true;
                            node.dirty = true;
                        }
                    });
                    RED.view.redraw();
                });

                entry.on('mouseout',function(e) {
                    RED.nodes.eachNode(function(node) {
                        if(node.highlighted) {
                            node.highlighted = false;
                            node.dirty = true;
                        }
                    });
                    RED.view.redraw();
                });
            });
            category.open(true);
        }
    }

    function refreshConfigNodeList() {
        var validList = {"global":true};

        getOrCreateCategory("global",globalCategories);

        RED.nodes.eachWorkspace(function(ws) {
            validList[ws.id.replace(/\./g,"-")] = true;
            getOrCreateCategory(ws.id,flowCategories,ws.label);
        })
        RED.nodes.eachSubflow(function(sf) {
            validList[sf.id.replace(/\./g,"-")] = true;
            getOrCreateCategory(sf.id,subflowCategories,sf.name);
        })
        $(".workspace-config-node-category").each(function() {
            var id = $(this).attr('id').substring("workspace-config-node-category-".length);
            if (!validList[id]) {
                $(this).remove();
                delete categories[id];
            }
        })
        var globalConfigNodes = [];
        var configList = {};
        RED.nodes.eachConfig(function(cn) {
            if (cn.z) {//} == RED.workspaces.active()) {
                configList[cn.z.replace(/\./g,"-")] = configList[cn.z.replace(/\./g,"-")]||[];
                configList[cn.z.replace(/\./g,"-")].push(cn);
            } else if (!cn.z) {
                globalConfigNodes.push(cn);
            }
        });
        for (var id in validList) {
            if (validList.hasOwnProperty(id)) {
                createConfigNodeList(id,configList[id]||[]);
            }
        }
        createConfigNodeList('global',globalConfigNodes);
    }

    function init() {
        RED.sidebar.addTab({
            id: "devices",
            label: "devices",
            name: "device tab name",
            content: content,
            toolbar: toolbar,
            closeable: true,
            visible: false,
            onchange: function() { refreshConfigNodeList(); }
        });
        RED.actions.add("dnr:show-devices-tab",function() {RED.sidebar.show('devices')});

        $("#workspace-config-node-collapse-all").on("click", function(e) {
            e.preventDefault();
            for (var cat in categories) {
                if (categories.hasOwnProperty(cat)) {
                    categories[cat].close();
                }
            }
        });
        $("#workspace-config-node-expand-all").on("click", function(e) {
            e.preventDefault();
            for (var cat in categories) {
                if (categories.hasOwnProperty(cat)) {
                    if (categories[cat].size() > 0) {
                        categories[cat].open();
                    }
                }
            }
        });
        $('#workspace-config-node-filter-all').on("click",function(e) {
            e.preventDefault();
            if (showUnusedOnly) {
                $(this).addClass('selected');
                $('#workspace-config-node-filter-unused').removeClass('selected');
                showUnusedOnly = !showUnusedOnly;
                refreshConfigNodeList();
            }
        });
        $('#workspace-config-node-filter-unused').on("click",function(e) {
            e.preventDefault();
            if (!showUnusedOnly) {
                $(this).addClass('selected');
                $('#workspace-config-node-filter-all').removeClass('selected');
                showUnusedOnly = !showUnusedOnly;
                refreshConfigNodeList();
            }
        });


    }
    function show(id) {
        if (typeof id === 'boolean') {
            if (id) {
                $('#workspace-config-node-filter-unused').click();
            } else {
                $('#workspace-config-node-filter-all').click();
            }
        }
        refreshConfigNodeList();
        if (typeof id === "string") {
            $('#workspace-config-node-filter-all').click();
            id = id.replace(/\./g,"-");
            setTimeout(function() {
                var node = $(".palette_node_id_"+id);
                var y = node.position().top;
                var h = node.height();
                var scrollWindow = $(".sidebar-node-config");
                var scrollHeight = scrollWindow.height();

                if (y+h > scrollHeight) {
                    scrollWindow.animate({scrollTop: '-='+(scrollHeight-(y+h)-30)},150);
                } else if (y<0) {
                    scrollWindow.animate({scrollTop: '+='+(y-10)},150);
                }
                var flash = 21;
                var flashFunc = function() {
                    if ((flash%2)===0) {
                        node.removeClass('node_highlighted');
                    } else {
                        node.addClass('node_highlighted');
                    }
                    flash--;
                    if (flash >= 0) {
                        setTimeout(flashFunc,100);
                    }
                }
                flashFunc();
            },100);
        }
        RED.sidebar.show("config");
    }
    return {
        init:init,
        show:show,
        refresh:refreshConfigNodeList
    }
})();


