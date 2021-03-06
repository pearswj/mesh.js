/*
MESH.JS

Copyright (c) 2014 Will Pearson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// width and height
var w = 500;
var h = 230;

var vertices = [
  [11, 20], [250, 160], [150, 50],
  [320, 20], [65, 160], [85, 21],
  [130, 200]
  ];

var faces = [
  [0, 4, 5], [5, 4, 6, 2], [2, 6, 1], [2, 1, 3]
  ];

document.getElementById("points").getElementsByClassName("sectionCode")[0].children[0].innerHTML =
  "vertices = [" + vertices.map(function(d) {
    return "[" + d + "]";
  }) + "]";
    
document.getElementById("faces").getElementsByClassName("sectionCode")[0].children[0].innerHTML =
  "faces = [" + faces.map(function(d) {
    return "[" + d + "]";
  }) + "]";
  
//--------------------------- START: HALFEDGE MESH ---------------------------//

var mesh = {};
mesh.vertices = [];
mesh.faces = [];
mesh.halfedges = [];

// add vertices
for (var i = 0; i < vertices.length; i++) {
  mesh.vertices.push({
    x: vertices[i][0],
    y: vertices[i][1],
    halfedge: -1
  });
}

// find halfedge function
function findHalfedge(start, end) {
  var pair = 0;
  for (var i = 0; i < mesh.halfedges.length; i++) {
    if (i % 2 == 0) {
      pair = i + 1;
    } else {
      pair = i - 1;
    }
    if (mesh.halfedges[i].start == start && mesh.halfedges[pair].start == end) {
      return i;
    }
  }
  return -1;
}

// get pair halfedge function
function getPairHalfedge(i) {
  i = parseInt(i)
  if (i % 2 == 0) {
    return i + 1;
  } else {
    return i - 1;
  }
}

//// CIRCULATORS
var circulatorlimit = 999;

function getFaceHalfedges(halfedge)
{
  var halfedges = [];
  //var halfedge = mesh.faces[f].halfedge;
  var h = halfedge;
  var count = 0;
  do {
    halfedges.push(h);
    h = mesh.halfedges[h].next;
    if (h < 0) { throw "Unset index, cannot continue."; }
    if (count++ > circulatorlimit) { throw "Runaway face circulator."; }
  } while (h != halfedge);
  return halfedges;
}

// get vertices for a given face (specified by one its adjacent halfedges)
function getFaceVertices(halfedge)
{
  var vertices = [];
  //var halfedge = mesh.faces[f].halfedge;
  var h = halfedge;
  var count = 0;
  do {
    vertices.push(mesh.halfedges[h].start);
    h = mesh.halfedges[h].next;
    if (h < 0) { throw "Unset index, cannot continue."; }
    if (count++ > circulatorlimit) { throw "Runaway face circulator."; }
  } while (h != halfedge);
  return vertices;
}

// add halfedge pair function
function addPair(start, end, face) {
  var retval = mesh.halfedges.length;
  mesh.halfedges.push({
    start: start,
    adj: face,
    next: -1,
    prev: -1
  });
  mesh.halfedges.push({
    start: end,
    adj: -1,
    next: -1,
    prev: -1
  });
  return retval;
}

// add face function
function addFace(vertices) {
  var n = vertices.length;
  
  // don't allow degenerate faces
  if (n < 3) {
    return -1;
  }
  
  // check that all vertex indices exist in this mesh
  for (var i = 0; i < n; i++) {
    if (i < 0 || i >= mesh.vertices.length) {
      return -2;
    }
  }
  
  // for each pair of vertices, check for an existing halfedge
  // if it exists, check that it doesn't already have a face
  // if it doesn't exist, mark for creation of a new halfedge pair
  var loop = [];
  var is_new = [];
  for (var i = 0; i < n; i++) {
    var h = findHalfedge(vertices[i], vertices[(i + 1) % n]);
    if (h.adj >= 0) {
      return -3;
    }
    loop.push(h);
    is_new.push(h < 0);
  }
  
  // now create any missing halfedge pairs...
  // (this could be done in the loop above but it avoids having to tidy up
  // any recently added halfedges should a non-manifold edge be found.)
  for (var i = 0; i < n; i++) {
    //if (loop[i] < 0) { // new halfedge pair required
      if (is_new[i]) { // new halfedge pair required
      var start = vertices[i];
      var end = vertices[(i + 1) % n];
      loop[i] = addPair(start, end, mesh.faces.length);
    } else {
      // Link existing halfedge to new face
      mesh.halfedges[loop[i]].adj = mesh.faces.length;
    }
  }
  
  // link all the halfedges
  for (var i = 0, ii = 1; i < n; i++, ii++, ii %= n) {
    // Link outer halfedges
    var outer_prev = -1, outer_next = -1;
    var id = 0;
    if (is_new[i]) {
      id += 1; // first is new
    }
    if (is_new[ii]) {
      id += 2; // second is new
    }
    
    switch(id)
    {
    case 1: // first is new, second is old
      // TODO: iterate through halfedges clockwise around end vertex until boundary
      outer_prev = mesh.halfedges[loop[ii]].prev;
      outer_next = getPairHalfedge(loop[i]);
      break;
    case 2: // second is new, first is old
      outer_prev = getPairHalfedge(loop[ii]);
      outer_next = mesh.halfedges[loop[i]].next;
      break;
    default: // (case 3) both are new
      outer_prev = getPairHalfedge(loop[ii]);
      outer_next = getPairHalfedge(loop[i]);
    }
    
    if (outer_prev > -1 && outer_next > -1)
    {
      mesh.halfedges[outer_prev].next = outer_next;
      mesh.halfedges[outer_next].prev = outer_prev;
    }

    // link inner halfedges
    mesh.halfedges[loop[i]].next = loop[ii];
    mesh.halfedges[loop[ii]].prev = loop[i];
    
    // ensure vertex->outgoing is boundary if vertex is boundary
    if (is_new[i]) { // first is new
        mesh.vertices[vertices[ii]].halfedge = loop[i] + 1;
    }
  }
  
  // finally, add the face
  mesh.faces.push({
    halfedge: loop[0]
  });
}

// add faces (and halfedges)
for (var i = 0; i < faces.length; i++) {
  addFace(faces[i]);
}

function getEdgeVector(i) {
  var d = mesh.halfedges[i];
  var x1 = mesh.vertices[d.start].x;
  var x2 = mesh.vertices[mesh.halfedges[getPairHalfedge(i)].start].x;
  var y1 = mesh.vertices[d.start].y;
  var y2 = mesh.vertices[mesh.halfedges[getPairHalfedge(i)].start].y;
  var x = x2 - x1;
  var y = y2 - y1;
  var inverseLength = 1.0 / Math.sqrt(x * x + y * y);
  return {
    x: x * inverseLength,
    y: y * inverseLength
  };
}

//--------------------------- END:   HALFEDGE MESH ---------------------------//

//// Some helper functions

// rotate a vector (radians)
function rotateVector(vector, theta) {
  cs = Math.cos(theta);
  sn = Math.sin(theta);
  return {
    x: vector.x * cs - vector.y * sn,
    y: vector.x * sn + vector.y * cs
  };
}

// create edge lines
function createEdgeLines() {
  lines = []
  var n = mesh.halfedges.length;
  for (var i = 0; i < n; i += 2) {
    var d = mesh.halfedges[i];
    var x1 = mesh.vertices[d.start].x;
    var x2 = mesh.vertices[mesh.halfedges[getPairHalfedge(i)].start].x;
    var y1 = mesh.vertices[d.start].y;
    var y2 = mesh.vertices[mesh.halfedges[getPairHalfedge(i)].start].y;
    lines.push({
      x1: x1,
      x2: x2,
      y1: y1,
      y2: y2
    });
  }
  return lines;
}

function createOffsetEdgeLines(offset, short) {
  lines = []
  var n = mesh.halfedges.length;
  for (var i = 0; i < n; i++) {
    var d = mesh.halfedges[i];
    var x1 = mesh.vertices[d.start].x;
    var x2 = mesh.vertices[mesh.halfedges[getPairHalfedge(i)].start].x;
    var y1 = mesh.vertices[d.start].y;
    var y2 = mesh.vertices[mesh.halfedges[getPairHalfedge(i)].start].y;
    var eVec = getEdgeVector(i);
    var oVec = rotateVector(eVec, Math.PI * -0.5);
    lines.push({
      x1: x1 + offset * oVec.x + short * eVec.x,
      x2: x2 + offset * oVec.x - short * eVec.x,
      y1: y1 + offset * oVec.y + short * eVec.y,
      y2: y2 + offset * oVec.y - short * eVec.y
    });
  }
  return lines;
}

// create arrows (because D3 won't do it for me...)
function createArrows(lines) {
  var arrows = [];
  var n = lines.length;
  for (var i = 0; i < n; i++) {
    var eVec = getEdgeVector(i);
    var oVec = rotateVector(eVec, Math.PI * -0.5);
    arrows.push({
      x1: lines[i].x2,
      x2: lines[i].x2 + 3.0 * oVec.x - 3.0 * eVec.x,
      y1: lines[i].y2,
      y2: lines[i].y2 + 3.0 * oVec.y - 3.0 * eVec.y
    });
  }
  return arrows;
}

// create SVG element: vertices
var svg = d3.select("#points .sectionGraphic")
  .append("svg")
  .attr("width", w)
  .attr("height", h);

var c = svg.selectAll("circle")
  .data(mesh.vertices)
  .enter()
  
  c.append("circle")
  .attr("cx", function(d) {
  	return d.x;
  })
  .attr("cy", function(d) {
  	return d.y;
  })
  .attr("r", 4)
  .attr("class", function(d, i) {
    return "vertex-" + i;
  })
  .attr("vertex", function(d, i) {
    return i;
  })
  .on('mouseover', function(d) {
    d3.selectAll("." + this.getAttribute('class') + "-halo").style({visibility:'visible'});
    var h = mesh.vertices[this.getAttribute('vertex')].halfedge;
    d3.selectAll(".halfedge-" + h).style({'stroke-width':3});
    // object description
    document.getElementById("points")
      .getElementsByClassName("sectionObject")[0].innerHTML =
      "<pre>\n<code>\nVertex #" + this.getAttribute('vertex')
      + "\n  x: " + mesh.vertices[this.getAttribute('vertex')].x
      + "\n  y: " + mesh.vertices[this.getAttribute('vertex')].y
      + "\n  halfedge: " + mesh.vertices[this.getAttribute('vertex')].halfedge
      + "\n</code>\n</pre>";
  })
  .on('mouseout', function(d) {
    d3.selectAll("." + this.getAttribute('class') + "-halo").style({visibility:'hidden'});
    var h = mesh.vertices[this.getAttribute('vertex')].halfedge;
    d3.selectAll(".halfedge-" + h).style({'stroke-width':1});
    // object description
    document.getElementById("points")
      .getElementsByClassName("sectionObject")[0].innerHTML = "";
  });

c.append("circle")
  .attr("cx", function(d) {
  	return d.x;
  })
  .attr("cy", function(d) {
  	return d.y;
  })
  .attr("r", 10)
  .attr("fill", "none")
  .attr("stroke", "black")
  .attr("class", function(d, i) {
    return "vertex-" + i + "-halo";
  })
  .attr("visibility", "hidden");

svg.selectAll("text")
  .data(vertices)
  .enter()
  .append("text")
  .text(function(d, i) {
  	return i;
  })
  .attr("x", function(d) {
  	return d[0] + 5;
  })
  .attr("y", function(d) {
  	return d[1] + 10;
  })
  .attr("font-family", "sans-serif")
  .attr("font-size", "11px")

// create another SVG element: faces
var svg2 = d3.select("#faces .sectionGraphic")
  .append("svg")
  .attr("width", w)
  .attr("height", h);

svg2.selectAll("polygon")
  .data(mesh.faces)
  .enter()
  .append("polygon")
  .attr("points", function(d) {
  	return getFaceVertices(d.halfedge).map(function(e) {
  		return mesh.vertices[e].x + "," + mesh.vertices[e].y;
  	}).join(" ");
  })
  .attr("fill", "#DEF9EE")
  .attr("class", function(d, i) {
    return "face-" + i;
  })
  .attr("face", function(d, i) {
    return i;
  })
  .on('mouseover', function(d) {
    d3.select(this).style({'fill':"#bbf0d7"});
    var h = mesh.faces[this.getAttribute('face')].halfedge;
    d3.selectAll(".halfedge-" + h).style({'stroke-width':3});
    /*var halfedges = getFaceHalfedges(h);
    for (var i = 0; i < halfedges.length; i++) {
      var h = halfedges[i];
      d3.selectAll(".halfedge-" + halfedges[i]).style({'stroke-width':3});
    }*/
    // object description
    document.getElementById("faces")
      .getElementsByClassName("sectionObject")[0].innerHTML =
      "<pre>\n<code>\nFace #" + this.getAttribute('face')
      + "\n  halfedge: " + mesh.faces[this.getAttribute('face')].halfedge
      + "\n</code>\n</pre>";
  })
  .on('mouseout', function(d) {
    d3.select(this).style({'fill':"#DEF9EE"});
    var h = mesh.faces[this.getAttribute('face')].halfedge;
    d3.selectAll(".halfedge-" + h).style({'stroke-width':1});
    /*var halfedges = getFaceHalfedges(h);
    for (var i = 0; i < halfedges.length; i++) {
      d3.selectAll(".halfedge-" + halfedges[i]).style({'stroke-width':1});
    }*/
    // object description
    document.getElementById("faces")
      .getElementsByClassName("sectionObject")[0].innerHTML = "";
  });

var polygons = [];
for (var i = 0; i < faces.length; i++) {
  polygons.push(d3.geom.polygon(faces[i].map(function(d) {
    return vertices[d];
  })));
}

svg2.selectAll("text")
  .data(polygons)
  .enter()
  .append("text")
  .text(function(d, i) {
  	return i;
  })
  .attr("x", function(d) {
  	return d.centroid()[0];
  })
  .attr("y", function(d) {
  	return d.centroid()[1];
  })
  .attr("font-family", "sans-serif")
  .attr("font-size", "11px");

svg2.selectAll("line")
  .data(createEdgeLines())
  .enter()
  .append("line")
  .attr("x1", function(d) {
    return d.x1;
  })
  .attr("x2", function(d) {
    return d.x2;
  })
  .attr("y1", function(d) {
    return d.y1;
  })
  .attr("y2", function(d) {
    return d.y2;
  })
  .attr("stroke", "black")
  .attr("stroke-width", .5)
  .attr("stroke-dasharray", "5,5")

var c2 = svg2.selectAll("circle")
  .data(mesh.vertices)
  .enter();

  c2.append("circle")
  .attr("cx", function(d) {
  	return d.x;
  })
  .attr("cy", function(d) {
  	return d.y;
  })
  .attr("r", 2)
  .attr("class", function(d, i) {
    return "vertex-" + i;
  })
  .attr("vertex", function(d, i) {
    return i;
  })
  .on('mouseover', function(d) {
      d3.selectAll("." + this.getAttribute('class') + "-halo").style({visibility:'visible'});
    var h = mesh.vertices[this.getAttribute('vertex')].halfedge;
    d3.selectAll(".halfedge-" + h).style({'stroke-width':3});
  })
  .on('mouseout', function(d) {
      d3.selectAll("." + this.getAttribute('class') + "-halo").style({visibility:'hidden'});
    var h = mesh.vertices[this.getAttribute('vertex')].halfedge;
    d3.selectAll(".halfedge-" + h).style({'stroke-width':1});
  });

c2.append("circle")
  .attr("cx", function(d) {
  	return d.x;
  })
  .attr("cy", function(d) {
  	return d.y;
  })
  .attr("r", 10)
  .attr("fill", "none")
  .attr("stroke", "black")
  .attr("class", function(d, i) {
    return "vertex-" + i + "-halo";
  })
  .attr("visibility", "hidden");

// create another SVG element: faces
var svg3 = d3.select("#halfedges .sectionGraphic")
  .append("svg")
  .attr("width", w)
  .attr("height", h);

var edgeLines = createOffsetEdgeLines(2.0, 15.0);

svg3.selectAll("line")
  .data(edgeLines)
  .enter()
  .append("line")
  .attr("x1", function(d) {
    return d.x1;
  })
  .attr("x2", function(d) {
    return d.x2;
  })
  .attr("y1", function(d) {
    return d.y1;
  })
  .attr("y2", function(d) {
    return d.y2;
  })
  .attr("stroke-width", 1)
  .attr("stroke", "black")
  .attr("class", function(d, i) {
    return "halfedge-" + i;
  })
  .attr("halfedge", function(d, i) {
    return i;
  })
  .on('mouseover', function(d) {
    d3.select(this).style({'stroke-width':3});
    d3.selectAll(".halfedge-" + mesh.halfedges[this.getAttribute('halfedge')].next).style({'stroke-width':3}).style({'stroke':"#7ff0e8"});
    d3.selectAll(".halfedge-" + mesh.halfedges[this.getAttribute('halfedge')].prev).style({'stroke-width':3}).style({'stroke':"#f0df7f"});
    d3.selectAll(".halfedge-" + getPairHalfedge(this.getAttribute('halfedge'))).style({'stroke-width':3}).style({'stroke':"#e296f0"});
    d3.selectAll(".face-" + mesh.halfedges[this.getAttribute('halfedge')].adj).style({'fill':"#bbf0d7"});
    d3.selectAll(".vertex-" + mesh.halfedges[this.getAttribute('halfedge')].start + "-halo").style({visibility:'visible'});
    // object description
    document.getElementById("halfedges")
      .getElementsByClassName("sectionObject")[0].innerHTML =
      "<pre>\n<code>\nHalfedge #" + this.getAttribute('halfedge')
      + "\n  start: " + mesh.halfedges[this.getAttribute('halfedge')].start
      + "\n  adj: " + mesh.halfedges[this.getAttribute('halfedge')].adj
      + "\n  next: " + mesh.halfedges[this.getAttribute('halfedge')].next
      + "\n  prev: " + mesh.halfedges[this.getAttribute('halfedge')].prev
      + "\n</code>\n</pre>";
  })
  .on('mouseout', function(d) {
    d3.select(this).style({'stroke-width':1});
    d3.selectAll(".halfedge-" + mesh.halfedges[this.getAttribute('halfedge')].next).style({'stroke-width':1}).style({'stroke':"black"});
    d3.selectAll(".halfedge-" + mesh.halfedges[this.getAttribute('halfedge')].prev).style({'stroke-width':1}).style({'stroke':"black"});
    d3.selectAll(".halfedge-" + getPairHalfedge(this.getAttribute('halfedge'))).style({'stroke-width':1}).style({'stroke':"black"});
    d3.selectAll(".face-" + mesh.halfedges[this.getAttribute('halfedge')].adj).style({'fill':"#DEF9EE"});
    d3.selectAll(".vertex-" + mesh.halfedges[this.getAttribute('halfedge')].start + "-halo").style({visibility:'hidden'});
    // object description
    document.getElementById("halfedges")
      .getElementsByClassName("sectionObject")[0].innerHTML = "";
  });

svg3.selectAll(".arrow")
  .data(createArrows(edgeLines))
  .enter()
  .append("line")
  .attr("x1", function(d) {
    return d.x1;
  })
  .attr("x2", function(d) {
    return d.x2;
  })
  .attr("y1", function(d) {
    return d.y1;
  })
  .attr("y2", function(d) {
    return d.y2;
  })
  .attr("stroke-width", 1)
  .attr("stroke", "black");
  
svg3.selectAll("text")
  .data(createOffsetEdgeLines(12.0, 0.0))
  .enter()
  .append("text")
  .text(function(d, i) {
  	return i;
  })
  .attr("x", function(d) {
  	return 0.5 * (d.x1 + d.x2);
  })
  .attr("y", function(d) {
  	return 0.5 * (d.y1 + d.y2);
  })
  .attr("font-family", "sans-serif")
  .attr("font-size", "11px")
  .attr("text-anchor", "middle")
  .attr("dominant-baseline", "central");

var c3 = svg3.selectAll("circle")
  .data(mesh.vertices)
  .enter()

c3.append("circle")
  .attr("cx", function(d) {
  	return d.x;
  })
  .attr("cy", function(d) {
  	return d.y;
  })
  .attr("r", 2)
  .attr("class", function(d, i) {
    return "vertex-" + i;
  })
  .attr("vertex", function(d, i) {
    return i;
  })
  .on('mouseover', function(d) {
    d3.selectAll("." + this.getAttribute('class') + "-halo").style({visibility:'visible'});
    var h = mesh.vertices[this.getAttribute('vertex')].halfedge;
    d3.selectAll(".halfedge-" + h).style({'stroke-width':3});
  })
  .on('mouseout', function(d) {
    d3.selectAll("." + this.getAttribute('class') + "-halo").style({visibility:'hidden'});
    var h = mesh.vertices[this.getAttribute('vertex')].halfedge;
    d3.selectAll(".halfedge-" + h).style({'stroke-width':1});
  });

c3.append("circle")
  .attr("cx", function(d) {
  	return d.x;
  })
  .attr("cy", function(d) {
  	return d.y;
  })
  .attr("r", 10)
  .attr("fill", "none")
  .attr("stroke", "black")
  .attr("class", function(d, i) {
    return "vertex-" + i + "-halo";
  })
  .attr("visibility", "hidden");