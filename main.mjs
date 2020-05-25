// some colour variables
const tcBlack = "#ecfC0E";
const imageSize = 40;
const imageFocusSize = 50;

// rest of vars
const w = document.getElementById("vis").offsetWidth;
const h = document.getElementById("vis").offsetHeight;
const maxNodeSize = 50;
const x_browser = 0;
const y_browser = 25;
let units;
let counters;
let hideBuildings = false;
let selected = null;

const force = d3.layout.force();

const vis = d3.select("#vis").append("svg").attr("style", "width:100%;height:100%;top:0;left:0;bottom:0;right:0;");

d3.json("data.json", function (json) {

  units = json.units;
  units.fixed = true;
  units.x = w / 2;
  units.y = h / 2;
  counters = json.counters;

  // Build the path
  const defs = vis.insert("svg:defs")
    .data(["end"]);


  defs.enter().append("svg:path")
    .attr("d", "M0,-5L10,0L0,5");

  update();
});


/**
 *   
 */
function update() {
  const [nodes, allNodes] = flatten(units);
  const links = d3.layout.tree().links(nodes);

  // Restart the force layout.
  force.nodes(nodes)
    .links(links)
    .gravity(0.05)
    .charge(-1500)
    .linkDistance(100)
    .friction(0.5)
    .linkStrength(function (l, i) { return 1; })
    .size([w, h])
    .on("tick", tick)
    .start();

  let path = vis.selectAll("path.link")
    .data(links, function (d) {
      return d.target.id;
    }).attr("class", "link")
    .style("stroke", (selected ? "#f22" : "#eee"));

  path.enter().insert("svg:path")
    .attr("class", "link")
    // .attr("marker-end", "url(#end)")
    .style("stroke", (selected ? "#f22" : "#eee"));


  // Exit any old paths.
  path.exit().remove();



  // Update the nodes…
  let node = vis.selectAll("g.node")
    .data(nodes, function (d) { return d.id; });


  // Enter any new nodes.
  const nodeEnter = node.enter().append("svg:g")
    .attr("class", "node")
    .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; })
    .on("click", function click(d) {
      if (d.type == "building") {
        if (d.children) {
          d.children = null;
        } else {
          console.log(d.units)
          d.children = d.units;
        }
      } else {
        if (d.children) {
          selected = null;
          hideBuildings = false;
          d.children = null;
        } else {
          if (selected) {
            selected.children = null;
          }
          selected = d;
          hideBuildings = true;
          d.children = d.counters;
        }
        console.log(d.counters);
      }
      update();
    })
    .call(force.drag);

  const foreignObject = nodeEnter.append('foreignObject')
    .attr("x", function (d) { return -imageSize / 2; })
    .attr("y", function (d) { return -imageSize / 2; })
    .attr("width", imageFocusSize)
    .attr("height", imageFocusSize);

  // Append images
  const images = foreignObject.append('xhtml:div')
    .append("img")
    .attr("src", function (d) { return d.img; })
    .attr("x", function (d) { return -imageSize / 2; })
    .attr("y", function (d) { return -imageSize / 2; })
    .attr("height", imageSize)
    .attr("width", imageSize);

  // make the image grow a little on mouse over and add the text details on click
  const setEvents = images
    // Append hero text
    .on('click', function (d) {
      d3.select("h2").html(d.name);
      d3.select("h3").html("<a href='" + d.link + "' >" + "Wiki link" + "</a>");
    })

    .on('mouseenter', function () {
      // select element in current context
      d3.select(this)
        .transition()
        .attr("x", function (d) { return -imageFocusSize / 2; })
        .attr("y", function (d) { return -imageFocusSize / 2; })
        .attr("height", imageFocusSize)
        .attr("width", imageFocusSize);
    })
    // set back
    .on('mouseleave', function () {
      d3.select(this)
        .transition()
        .attr("x", function (d) { return -imageSize / 2; })
        .attr("y", function (d) { return -imageSize / 2; })
        .attr("height", imageSize)
        .attr("width", imageSize);
    });

  // Append name on roll over next to the node as well
  nodeEnter.append("text")
    .attr("class", "nodetext")
    .attr("x", x_browser)
    .attr("y", y_browser + 20)
    .attr("fill", tcBlack)
    .text(function (d) { return d.name; });


  // Exit any old nodes.
  node.exit().remove();


  // Re-select for update.
  path = vis.selectAll("path.link");
  node = vis.selectAll("g.node");

  function tick() {
    path.attr("d", function (d) {
      //console.log(d.source.name)
      const dx = d.target.x - d.source.x,
        dy = d.target.y - d.source.y,
        dr = Math.sqrt(dx * dx + dy * dy);
      return "M" + d.source.x + ","
        + d.source.y
        + "A" + dr + ","
        + dr + " 0 0,0 "
        + d.target.x + ","
        + d.target.y;
    });
    node.attr("transform", nodeTransform);
  }
}


/**
 * Gives the coordinates of the border for keeping the nodes inside a frame
 * http://bl.ocks.org/mbostock/1129492
 */
function nodeTransform(d) {
  d.x = Math.max(maxNodeSize, Math.min(w - (d.imgwidth / 2 || 16), d.x));
  d.y = Math.max(maxNodeSize, Math.min(h - (d.imgheight / 2 || 16), d.y));
  return "translate(" + d.x + "," + d.y + ")";
}

/**
 * Returns a list of all nodes under the units.
 */
function flatten(units) {
  let nodes = [];
  const nameToNode = {};
  const allNodes = [];
  let i = 0;

  function listNodes(node) {
    if (node.children) {
      node.units = node.children;
      node.children.forEach(listNodes);
    }
    if (!node.id) {
      node.id = ++i;
    }
    if (!(node.type == "building") || !hideBuildings) {
      nodes.push(node);
    }
    allNodes.push(node);
    nameToNode[node.name] = node;
  }
  listNodes(units);
  for (let node of nodes) {
    node.counters = [];
    if (!(node.name in counters)) {
      continue;
    }
    for (let counterName of counters[node.name]) {
      const counter = nameToNode[counterName];
      node.counters.push(counter);
    }
  }
  if (selected) {
    nodes = [selected].concat(selected.counters);
  }
  return [nodes, allNodes];
} 
