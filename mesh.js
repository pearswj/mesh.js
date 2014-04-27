// width and height
var w = 500;
var h = 230;

var vertices = [
  [11, 20], [250, 160], [150, 50],
  [370, 20], [65, 160], [85, 21],
  [130, 200]
  ];

var faces = [
  [0, 4, 5], [5, 4, 2], [4, 6, 1], [2, 4, 1], [2, 1, 3]
  ];
  
//--------------------------- START: HALFEDGE MESH ---------------------------//

var mesh = {};
mesh.vertices = [];
mesh.faces = [];
mesh.halfedges = [];

// add vertices
for (i = 0; i < vertices.length; i++) {
  mesh.vertices.push({
    x: vertices[i][0],
    y: vertices[i][1],
    halfedge: -1
  });
}

// find halfedge function
function findHalfedge(start, end) {
  var pair = 0;
  for (i = 0; i < mesh.halfedges.length; i++) {
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

// add faces (and halfedges)
for (i = 0; i < faces.length; i++) {
  mesh.faces.push({
    halfedge: mesh.halfedges.length
  });
  // add halfedges
  for (j = 0; j < faces[i].length; j++) {
    mesh.halfedges.push({
      start: faces[i][j],
      adj: i,
      next: -1,
      prev: -1,
    });
    mesh.halfedges.push({
      start: faces[i][(j + 1) % faces[i].length],
      adj: -1,
      next: -1,
      prev: -1,
    });
  }
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