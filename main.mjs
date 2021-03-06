// some colour variables
const tcBlack = "#FFA800";
let imageSize;
let imageFocusSize;
let init = true;
let nameToNode = {};
let allNodes = [];
let lastUniqueId = 0;

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
let selectedCiv = null;
let expendedBuilding = null;

const civsData = {};
const unitNameToCivs = {};

const force = d3.layout.force();

const vis = d3.select("#vis").append("svg").attr("style", "width:100%;height:100%;top:0;left:0;bottom:0;right:0;");

d3.json("data.json", function (json) {

  units = json.units;
  units.fixed = true;
  counters = json.counters;

  getAllNodes(units, allNodes, nameToNode);
  addCivNodes(json.civilizations, unitNameToCivs, allNodes, nameToNode, civsData);
  addCountersToNodes(allNodes);

  // Build the path
  const defs = vis.insert("svg:defs")
    .data(["end"]);


  defs.enter().append("svg:path")
    .attr("d", "M0,-5L10,0L0,5");

  const radio = Array.from(document.getElementById("filter-list").querySelectorAll('input'));
  const selectedFilter = radio.length && radio.find(r => r.checked).value;
  updateFilterAndRefresh(selectedFilter, civsData, nameToNode);
  setFilterCallback();
  update();
});

function setFilterCallback() {
  document.getElementById("filter-list").addEventListener('click', onFilterClick);
}

function onFilterClick(event) {
  if (event.target && event.target.matches("input[type='radio']")) {
    updateFilterAndRefresh(event.target.value, civsData, nameToNode);
  }
}

function updateFilterAndRefresh(civilization, civsData, nameToNode) {
  if (selected) {
    selected.children = null;
    selected = null;
  }
  updateFilter(civilization, civsData, nameToNode);
  update();
}

function updateFilter(civilization, civsData, nameToNode) {
  d3.select("#filter-selected").html("Selected: " + civilization);
  const civData = civsData[civilization];
  selectedCiv = civData;
  units.img = civData.img;
  units.name = civData.name;
  units.link = civData.link;
  units.units = [];
  for (let [building, buildingUnits] of Object.entries(civData.buildings)) {
    const buildingNode = nameToNode[building];
    units.units.push(buildingNode);
    buildingNode.units = buildingUnits;
    buildingNode.children = buildingUnits;
  }
  units.children = units.units;
}

function generateUniqueId() {
  lastUniqueId += 1;
  return lastUniqueId;
}

function getAllNodes(node, allNodes, nameToNode) {
  setupNode(node, nameToNode, allNodes);
  if (node.children) {
    node.units = node.children;
    node.children.forEach(n => getAllNodes(n, allNodes, nameToNode));
  }
}

function addCountersToNodes(allNodes) {
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
}

function addCivNodes(json, unitNameToCivs, allNodes, nameToNode, civsData) {
  for (let civ of json) {
    civsData[civ.name] = civ;
    if ("unique" in civ) {
      for (let unique of civ.unique) {
        setupNode(unique, nameToNode, allNodes);
      }
    }
    civ.buildings = {};
    for (let [building, units] of Object.entries(civ.units)) {
      civ.buildings[building] = [];
      for (let unit of units.good) {
        civ.buildings[building].push(nameToNode[unit]);
        if (!(unit in unitNameToCivs)) {
          unitNameToCivs[unit] = [];
        }
        unitNameToCivs[unit].push(civ.name);
      }
      for (let unit of units.bad) {
        civ.buildings[building].push(nameToNode[unit]);
        if (!(unit in unitNameToCivs)) {
          unitNameToCivs[unit] = [];
        }
        unitNameToCivs[unit].push(civ.name);
      }
    }
  }
}

function setupNode(node, nameToNode, allNodes) {
  nameToNode[node.name] = node;
  allNodes.push(node);
  node.id = generateUniqueId();
  node.x = w / 2 + 10 * Math.random();
  node.y = h / 2 + 10 * Math.random();
  node.units = null;
  node.init = false;
}

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
          if (!unitNameToCivs[selected.name].includes(selectedCiv.name)) {
            const radioButton = document.querySelector("input[name=filter-pick][value=" + unitNameToCivs[selected.name][0] + "]");
            radioButton.checked = true;
            updateFilter(unitNameToCivs[selected.name][0], civsData, nameToNode);
          }
          hideBuildings = true;
          d.children = d.counters;
        }
      }
      update();
    });

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
      d3.select("#unit-name").html(d.name);
      d3.select("#unit-link").html("<a href='" + d.link + "' target='_blank' >" + "Wiki link" + "</a>");
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
