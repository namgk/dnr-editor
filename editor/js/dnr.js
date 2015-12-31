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
     var activeConstraint;
     var showConstraint = true;
     var constraints_colours = {
        "red":    "#c00",
        "green":  "#5a8",
        "yellow": "#F9DF31",
        "blue":   "#53A3F3",
        "grey":   "#d3d3d3"
    }

     function addConstraint(c) {
         constraints.push(c);
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
     function activeConstraint(){
        return activeConstraint;
     }
     function setActiveConstraint(c){
        activeConstraint = getConstraint(c);
     }
     function appendConstraints(node){
        var constraint = node.append("svg:g").attr("class","node_constraint_group").style("display","none");

        var constraintRect = constraint.append("rect").attr("class","node_constraint")
                            .attr("x",6).attr("y",1).attr("width",9).attr("height",9)
                            .attr("rx",2).attr("ry",2).attr("stroke-width","3");

        var constraintLabel = constraint.append("svg:text")
            .attr("class","node_constraint_label")
            .attr('x',20).attr('y',9);

     }
     function showConstraints(d, thisNode){
        if (!showConstraint || !d.constraint) {
            thisNode.selectAll('.node_constraint_group').style("display","none");
        } else {
            thisNode.selectAll('.node_constraint_group').style("display","inline").attr("transform","translate(3,"+(d.h+3)+")");
            var fill = constraints_colours[d.constraint.fill]; // Only allow our colours for now
            if (d.constraint.shape == null && fill == null) {
                thisNode.selectAll('.node_constraint').style("display","none");
            } else {
                var style;
                if (d.constraint.shape == null || d.constraint.shape == "dot") {
                    style = {
                        display: "inline",
                        fill: fill,
                        stroke: fill
                    };
                } else if (d.constraint.shape == "ring" ){
                    style = {
                        display: "inline",
                        fill: '#fff',
                        stroke: fill
                    }
                }
                thisNode.selectAll('.node_constraint').style(style);
            }
            if (d.constraint.text) {
                thisNode.selectAll('.node_constraint_label').text(d.constraint.text);
            } else {
                thisNode.selectAll('.node_constraint_label').text("");
            }
        }
     }
     return {
         addConstraint: addConstraint,
         removeConstraint: removeConstraint,
         getConstraint: getConstraint,
         allConstraint: allConstraint,
         getActiveConstraint: activeConstraint,
         setActiveConstraint: setActiveConstraint,
         appendConstraints: appendConstraints,
         showConstraints: showConstraints
     }
 })();
