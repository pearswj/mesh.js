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

function getPairHalfedge(i) {
  if (i % 2 == 0) {
    return i + 1;
  } else {
    return i - 1;
  }
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

//--------------------------- END:   HALFEDGE MESH ---------------------------//

// create SVG element: vertices
var svg = d3.select("#points .sectionGraphic")
  .append("svg")
  .attr("width", w)
  .attr("height", h);
  
/*
svg.append("line")
  .attr("x1", 0)
  .attr("x2", 40)
  .attr("y1", h)
  .attr("y2", h)
  .attr("stroke-width", 2)
  .attr("stroke", "black");
  
svg.append("line")
  .attr("x1", 0)
  .attr("x2", 0)
  .attr("y1", h)
  .attr("y2", h - 40)
  .attr("stroke-width", 2)
  .attr("stroke", "black");
*/

var c = svg.selectAll("circle")
  .data(vertices)
  .enter()
  
  c.append("circle")
  .attr("cx", function(d) {
  	return d[0];
  })
  .attr("cy", function(d) {
  	return d[1];
  })
  .attr("r", 4)
  .attr("class", function(d, i) {
    return "vertex-" + i;
  })
  .on('mouseover', function(d) {
      d3.selectAll("." + this.getAttribute('class') + "-halo").style({visibility:'visible'});
  })
  .on('mouseout', function(d) {
      d3.selectAll("." + this.getAttribute('class') + "-halo").style({visibility:'hidden'});
  });

c.append("circle")
  .attr("cx", function(d) {
  	return d[0];
  })
  .attr("cy", function(d) {
  	return d[1];
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
  .data(faces)
  .enter()
  .append("polygon")
  .attr("points", function(d) {
  	return d.map(function(e) {
  		return vertices[e].join(",");
  	}).join(" ");
  })
  .attr("stroke", "black")
  .attr("stroke-width", 2)
  .attr("fill", "#DEF9EE");

  var c2 = svg2.selectAll("circle")
    .data(vertices)
    .enter()
  
    c2.append("circle")
    .attr("cx", function(d) {
    	return d[0];
    })
    .attr("cy", function(d) {
    	return d[1];
    })
    .attr("r", 4)
    .attr("class", function(d, i) {
      return "vertex-" + i;
    })
    .on('mouseover', function(d) {
        d3.selectAll("." + this.getAttribute('class') + "-halo").style({visibility:'visible'});
    })
    .on('mouseout', function(d) {
        d3.selectAll("." + this.getAttribute('class') + "-halo").style({visibility:'hidden'});
    });

  c2.append("circle")
    .attr("cx", function(d) {
    	return d[0];
    })
    .attr("cy", function(d) {
    	return d[1];
    })
    .attr("r", 10)
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("class", function(d, i) {
      return "vertex-" + i + "-halo";
    })
    .attr("visibility", "hidden");