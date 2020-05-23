// some colour variables
const tcBlack = "#130C0E";
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

const force = d3.layout.force();

const vis = d3.select("#vis").append("svg").attr("style", "width:100%;height:100%;top:0;left:0;bottom:0;right:0;");

d3.json("data.json", function (json) {

  units = json.units;
  units.fixed = true;
  units.x = w / 2;
  units.y = h / 2;


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
  const nodes = flatten(units),
    links = d3.layout.tree().links(nodes);

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
    .data(links, function (d) { return d.target.id; });

  path.enter().insert("svg:path")
    .attr("class", "link")
    // .attr("marker-end", "url(#end)")
    .style("stroke", "#eee");


  // Exit any old paths.
  path.exit().remove();



  // Update the nodes…
  let node = vis.selectAll("g.node")
    .data(nodes, function (d) { return d.id; });


  // Enter any new nodes.
  const nodeEnter = node.enter().append("svg:g")
    .attr("class", "node")
    .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; })
    .on("click", click)
    .call(force.drag);

  // Append a circle
  const cirle = nodeEnter.append("svg:circle")
    .attr("r", function (d) { return Math.sqrt(d.size) / 10 || 4.5; })
    .style("fill", "#eee");

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

  // Append hero name on roll over next to the node as well
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
 * Toggle children on click.
 */
function click(d) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }

  update();
}


/**
 * Returns a list of all nodes under the units.
 */
function flatten(units) {
  const nodes = [];
  let i = 0;

  function recurse(node) {
    if (node.children)
      node.children.forEach(recurse);
    if (!node.id)
      node.id = ++i;
    nodes.push(node);
  }

  recurse(units);
  return nodes;
} 
