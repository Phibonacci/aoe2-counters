// some colour variables
const tcBlack = "#FFA800";
let imageSize;
let imageFocusSize;
let init = true;
let nameToNode = {};
let allNodes = [];

// rest of vars
let w = document.getElementById("vis").offsetWidth;
let h = document.getElementById("vis").offsetHeight;
const maxNodeSize = 50;
const x_browser = 0;
const y_browser = 25;
let units;
let counters;
let hideBuildings = false;
let selected = null;
let expendedBuilding = null;

const force = d3.layout.force();

const vis = d3.select("#vis").append("svg").attr("style", "width:100%;height:100%;top:0;left:0;bottom:0;right:0;");

d3.json("data.json", function (json) {

  units = json.units;
  units.fixed = true;
  counters = json.counters;
  let id = 0;

  function getNameToNode(node) {
    node.id = ++id;
    node.x = w / 2 + 10 * Math.random();
    node.y = h / 2 + 10 * Math.random();
    node.units = null;
    if (node.children) {
      node.units = node.children;
      node.children.forEach(getNameToNode);
    }
    nameToNode[node.name] = node;
    node.init = false;
    allNodes.push(node);
  }
  getNameToNode(units);
  for (let node of allNodes) {
    node.counters = [];
    if (!(node.name in counters)) {
      continue;
    }
    for (let counterName of counters[node.name]) {
      const counter = nameToNode[counterName];
      node.counters.push(counter);
    }
  }

  // Build the path
  const defs = vis.insert("svg:defs")
    .data(["end"]);


  defs.enter().append("svg:path")
    .attr("d", "M0,-5L10,0L0,5");

  update();
});

function update() {
  window.onresize = update;
  w = document.getElementById("vis").offsetWidth;
  h = document.getElementById("vis").offsetHeight;
  units.x = w / 2;
  units.y = h / 2;
  imageSize = Math.exp(w / 1500) * 30;
  imageFocusSize = imageSize * 1.4;
  const [nodes, allNodes] = flatten(units);
  const links = d3.layout.tree().links(nodes);

  // Restart the force layout.
  force.nodes(nodes)
    .links(links)
    .gravity(1)
    .charge(-35 * imageSize * imageSize)
    .friction(0.1)
    .linkStrength(function (l, i) { return 5; })
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
    .style("stroke", (selected ? "#f22" : "#eee"));

  // Exit any old paths.
  path.exit().remove();

  // Remove all node so they are all redrawn on top of new links
  vis.selectAll("g.node").remove();

  // Update the nodes…
  let node = vis.selectAll("g.node")
    .data(nodes, function (d) { return d.id; });

  // Enter any new nodes.
  const nodeEnter = node.enter().append("svg:g")
    .attr("class", "node")
    .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; })
    .on("click", function click(d) {
      if (d.type === "building") {
        if (d.children) {
          d.children = null;
          expendedBuilding = null;
        } else {
          d.children = d.units;
          expendedBuilding = d;
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
      }
      update();
    });
  //.call(force.drag);

  const foreignObject = nodeEnter.append('foreignObject')
    .attr("x", function (d) { return -imageFocusSize / 2; })
    .attr("y", function (d) { return -imageFocusSize / 2; })
    .attr("width", imageFocusSize)
    .attr("height", imageFocusSize);

  // Append images
  const images = foreignObject.append('xhtml:div')
    .append("img")
    .attr("src", function (d) { return d.img; })
    .attr("style", function (d) { return "position: absolute;top: " + imageSize / 4 + "px;" + "left:" + imageSize / 4 + "px;"; })
    .attr("height", imageSize)
    .attr("width", imageSize);

  // make the image grow a little on mouse over and add the text details on click
  const setEvents = images
    // Append hero text
    .on('click', function (d) {
      d3.select("h2").html(d.name);
      d3.select("h3").html("<a href='" + d.link + "' target='_blank' >" + "Wiki link" + "</a>");
    })
    .on('mouseenter', function () {
      // select element in current context
      d3.select(this)
        .transition()
        .attr("style", function (d) { return "position: absolute;top:" + 0 + "px;" + "left:" + 0 + "px;"; })
        .attr("height", imageFocusSize)
        .attr("width", imageFocusSize);
    })
    // set back
    .on('mouseleave', function () {
      d3.select(this)
        .transition()
        .attr("style", function (d) { return "position: absolute;top:" + imageSize / 4 + "px;" + "left:" + imageSize / 4 + "px;"; })
        .attr("height", imageSize)
        .attr("width", imageSize);
    });

  // Append name on roll over next to the node as well
  nodeEnter.append("text")
    .attr("class", "nodetext")
    .attr("x", x_browser)
    .attr("y", y_browser + imageFocusSize / 2)
    .attr("fill", tcBlack)
    .text(function (d) { return d.name; });


  // Exit any old nodes.
  node.exit().remove();

  // Re-select for update.
  path = vis.selectAll("path.link");
  node = vis.selectAll("g.node");

  function tick() {
    w = document.getElementById("vis").offsetWidth;
    h = document.getElementById("vis").offsetHeight;
    units.x = w / 2;
    units.y = h / 2;
    path.attr("d", function (d) {
      const dx = d.target.x - d.source.x;
      const dy = d.target.y - d.source.y;
      const dr = Math.sqrt(dx * dx + dy * dy);
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
  return "translate(" + d.x + "," + d.y + ")";
}

/**
 * Returns a list of all nodes under the units.
 */
function flatten(units) {
  let nodes = [];
  let i = 0;

  function listNodes(node) {
    if (node.children) {
      if (node.type === "building" && node !== units && node !== expendedBuilding) {
        node.children = null;
      } else {
        node.children.forEach(listNodes);
      }
    }
    nodes.push(node);
  }
  listNodes(units);
  if (init) {
    init = false;
    nodes = [units];
    for (let node of units.children) {
      node.children = null;
      nodes.push(node);
    }
  } else if (selected) {
    nodes = [selected].concat(selected.counters);
  }
  return [nodes, allNodes];
} 
