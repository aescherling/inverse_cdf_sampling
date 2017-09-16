// to do: dynamically update histogram scales
// after that, allow changes in # of points, parameter, speed
// after that, add different distributions. that'll probably take the most work.

// svg properties
var svgWidth = 500;
var svgHeight = 500;

// set up svg and graph group
d3.select('#vis').append('svg')
	.attr('width', svgWidth)
	.attr('height', svgHeight);

var svg = d3.select('svg');

// svg outline, mostly just for development purposes
svg.append('rect')
  .attr('x', 0)
  .attr('y', 0)
  .attr('width', svgWidth)
  .attr('height', svgHeight)
  .attr('fill', 'white')
  .attr('stroke', 'black');

// graph properties
var graphMargin = {top: 30, right: 30, bottom: 200, left: 200},
    graphWidth = svg.attr("width") - graphMargin.left - graphMargin.right,
    graphHeight = svg.attr("height") - graphMargin.top - graphMargin.bottom,
    graph = svg.append("g")
    	.attr("transform", "translate(" + graphMargin.left + "," + graphMargin.top + ")");

// histogram on the y axis
var yHistMargin = {top: graphMargin.top, right: 50, bottom: graphMargin.bottom, left: 30},
    yHistWidth = svgWidth - graphWidth - graphMargin.right - yHistMargin.left - yHistMargin.right,
    yHistHeight = graphHeight,
    yHist = svg.append("g")
        .attr("transform", "translate(" + yHistMargin.left + "," + yHistMargin.top + ")");

// histogram on the x axis
var xHistMargin = {top: graphMargin.top + graphHeight + 50,
                   right: graphMargin.right, bottom: 30, left: graphMargin.left},
    xHistWidth = graphWidth,
    xHistHeight = svgHeight - xHistMargin.top - xHistMargin.bottom,
    xHist = svg.append("g")
        .attr("transform", "translate(" + xHistMargin.left + "," + xHistMargin.top + ")");

// CDF of the exponential distribution
// later add other distributions? Let user choose parameters?
var lambda = 3;
var exponentialCDF = function(x) {
	return 1 - Math.exp(-1 * lambda * x);
}
var inverseExponentialCDF = function (x) {
	return -1 * Math.log(1 - x) / lambda;
}

// generate points for plotting CDF
var makeRange = function(max, n) {
	out = [0];
	for (var i=1; i < (n + 1); i++) {
		out.push(max * i / n);
	}
	return out;
}

/* make a graph */
graphMax = inverseExponentialCDF(0.9999);
var x = makeRange(graphMax, 1e2);
var y = x.map(exponentialCDF);
var data = x.map(function(value, index){
  return {x: value, y: y[index]}
});

// scales
xScale = d3.scaleLinear().domain([0, graphMax]).range([0,graphWidth]).nice();
yScale = d3.scaleLinear().domain([0,1]).range([graphHeight, 0]);

// axes
graph.append('g')
	.attr('class', 'axis xAxis')
	.attr('transform', 'translate(0,' + graphHeight + ')')
	.call(d3.axisBottom(xScale).ticks(5));

graph.append('g')
	.attr('class', 'axis yAxis')
	.call(d3.axisLeft(yScale).ticks(5));

// function for making the line
var makeLine = d3.line()
    .x(function(d) { return xScale(d.x); })
    .y(function(d) { return yScale(d.y); });

// bind the data
var line = graph.selectAll('.line')
  .data([data])
  .enter().append('g')
  .attr('class', 'line');

// make the line
line.append('path')
  .attr('class', 'line')
  .attr('d', function (d) {return makeLine(data);});

/*
Data
*/

/* Draw a sample of 10 test points */
// WHAT IS THIS MADNESS???
// ECMAscript 6... freaky shit
//randomArray = (length) => [...new Array(length)]
//    .map(() => Math.random() );

// array of random numbers from Unif(0,1) distribution
function randomArray(length) {
    return Array.apply(null, Array(length)).map(function() {
        return Math.random();
    });
}

// generate random uniform numbers and convert to exponential dist using inverse CDF
sampleSize = 50;
y = randomArray(sampleSize);
x = y.map(inverseExponentialCDF);
data = x.map(function(value, index) {
	return {x: value, y: y[index]}
});

// function for calculating the counts necessary for producing a histogram
// input: data, lower end of lowest bin, high end of highest bin, desired # of bins
// output: JS object with variable "value" = count for each bin
calcHist = function (x, low, high, bins) {
  // scale the data & take floor to collapse into bins
  histScale = d3.scaleLinear().domain([low, high]).range([0,bins]);
  scaled = x.map(function(a) {return Math.floor(histScale(a));});

  // find the # of points in each bin
  hist = Array(bins);
  for (i=0; i < hist.length; i++){
    bool = scaled.map(function (a) {return (a == i);});
    val = d3.sum(bool);
    hist[i] = val;
  }

  // convert to JSON format
  //hist = hist.map(function (a) {return {value: a}});
  return hist;
}

// calculate histograms for points {1}, {1,2}, {1,2,3}, {1,...,sampleSize} with 10 bins
// scale to fit to the dimensions of the graph
bins = 10
xHistArray = [];
yHistArray = [];
xHistData = [];
yHistData = [];
index = []
for (i in x) {
  xTmp = x.slice(0,(+i +1));
  yTmp = y.slice(0,(+i +1));

  xHistTmp = calcHist(xTmp, 0, graphMax, bins);
  yHistTmp = calcHist(yTmp, 0, 1, bins);

  xHistArray.push(xHistTmp);
  yHistArray.push(yHistTmp);

  xMax = d3.max(xHistTmp);
  yMax = d3.max(yHistTmp);

  xHistScale = d3.scaleLinear().domain([0, xMax]).range([0, xHistHeight]);
  yHistScale = d3.scaleLinear().domain([0, yMax]).range([0, yHistWidth]);

  xHistData.push(xHistTmp.map(xHistScale));
  yHistData.push(yHistTmp.map(yHistScale));
}

// plot each point on the y axis, but leave hidden
graph.selectAll(".yDot")
  .data(data)
  .enter().append("circle")
  .classed('yDot', true)
  .attr("r", 4)
  .attr("cx", 0)
  .attr("cy", function (d) {return yScale(d.y)})
  .attr('opacity', 0);

// draw y axis histogram, but keep hidden.
yHistScaleY = d3.scaleLinear().domain([0, bins]).range([0, yHistHeight]);
yHist.selectAll('.yBar')
  .data(yHistData[0])
  .enter()
  .append('rect')
  .attr('class', 'yBar')
  .attr('width', 0)
  .attr('height', yHistScaleY(1))
  .attr('x', yHistWidth)
  .attr('y', function (d, i) {return yHistHeight - ((i+1) * yHistScaleY(1))})
  .attr('fill', 'steelblue')
  .attr('stroke', d3.rgb('steelblue').darker());

// draw axes of y axis histogram
scale = d3.scaleLinear().domain([0,1]).range([yHistWidth, 0]);
yHist.append('g')
  .attr('class', 'axis xAxis')
  .attr('transform', 'translate(0,' + graphHeight + ')')
  .call(d3.axisBottom(scale).ticks(5));

scale = d3.scaleLinear().domain([0,1]).range([0, yHistHeight]);
yHist.append('g')
  .attr('class', 'axis yAxis')
  .attr('transform', 'translate(' + yHistWidth + ',0)')
  .call(d3.axisRight(scale).ticks(0));

// draw x axis histogram, but keep hidden.
xHistScaleX = d3.scaleLinear().domain([0, bins]).range([0, xHistWidth]);
xHist.selectAll('.xBar')
  .data(xHistData[0])
  .enter()
  .append('rect')
  .attr('class', 'xBar')
  .attr('width', xHistScaleX(1))
  .attr('height', 0)
  .attr('x', function (d, i) {return i * xHistScaleX(1)})
  .attr('y', xHistHeight)
  .attr('fill', 'steelblue')
  .attr('stroke', d3.rgb('steelblue').darker());

// draw axes of x axis histogram
scale = d3.scaleLinear().domain([0,1]).range([xHistHeight, 0]);
xHist.append('g')
  .attr('class', 'axis yAxis')
  .call(d3.axisLeft(scale).ticks(5));

scale = d3.scaleLinear().domain([0,1]).range([0, xHistWidth]);
xHist.append('g')
  .attr('class', 'axis xAxis')
  .attr('transform', 'translate(0,' + xHistHeight + ')')
  .call(d3.axisBottom(scale).ticks(0));

// plot each line from the y axis to CDF, but leave hidden
graph.selectAll(".hLine")
  .data(data)
  .enter().append("line")
  .classed('hLine', true)
  .attr("x1", 0)
  .attr("y1", function (d) {return yScale(d.y)})
  .attr("x2", function(d) {return xScale(d.x)})
  .attr('y2', function (d) {return yScale(d.y)})
  .attr('stroke', 'black')
  .attr('opacity', 0); 

// plot each line from CDF to the x axis, but leave hidden
graph.selectAll(".vLine")
  .data(data)
  .enter().append("line")
  .classed('vLine', true)
  .attr("x1", function(d) {return xScale(d.x)})
  .attr("y1", function (d) {return yScale(d.y)})
  .attr("x2", function(d) {return xScale(d.x)})
  .attr('y2', graphHeight)
  .attr('stroke', 'black')
  .attr('opacity', 0); 

// plot each point on the x axis, but leave hidden
graph.selectAll(".xDot")
  .data(data)
  .enter().append("circle")
  .classed('xDot', true)
  .attr("r", 4)
  .attr("cx", function (d) {return xScale(d.x)})
  .attr("cy", graphHeight)
  .attr('opacity', 0); 

// transition time for each point
tt = 333;

// make y axis dot visible
graph.selectAll('.yDot')
  .each(function (d,i) {
    d3.select(this)
      .transition()
      .delay(i * tt)
      .attr('opacity', 1)
  })

// update y axis histogram
graph.selectAll('.yDot')
  .each(function (d,i) {
    myData = yHistData[i];

    d3.selectAll('.yBar')
      .transition()
      .delay(tt * i)
      .attr('width', function (dd, ii) {return myData[ii]})
      .attr('x', function (dd, ii) {return yHistWidth - myData[ii]});

    yMax = d3.max(yHistArray[i]);
    scale = d3.scaleLinear().domain([0,yMax]).range([yHistWidth, 0]);
    yHist.selectAll('g').filter('.xAxis')
      .transition()
      .delay(tt * i)
      .call(d3.axisBottom(scale).ticks(5));
  })

// update x axis histogram
graph.selectAll('.xDot')
  .each(function (d,i) {
    myData = xHistData[i];

    d3.selectAll('.xBar')
      .transition()
      .delay(tt * i)
      .attr('height', function (dd, ii) {return myData[ii]})
      .attr('y', function (dd, ii) {return xHistHeight - myData[ii]});

    xMax = d3.max(xHistArray[i]);
    scale = d3.scaleLinear().domain([0,xMax]).range([xHistHeight, 0]);
    xHist.selectAll('g').filter('.yAxis')
      .transition()
      .delay(tt * i)
      .call(d3.axisLeft(scale).ticks(5));    
  })

// make horizontal line visible
graph.selectAll('.hLine')
  .each(function (d,i) {
    d3.select(this)
      .transition()
      .delay((0.1 * tt) + (i * tt))
      .attr('opacity', 1);
  });

// make vertical line visible
graph.selectAll('.vLine')
  .each(function (d,i) {
    d3.select(this)
      .transition()
      .delay((0.3 * tt) + (i * tt))
      .attr('opacity', 1);
  });

// make x dot visible
graph.selectAll('.xDot')
  .each(function (d,i) {
    d3.select(this)
      .transition()
      .delay((0.4 * tt) + (i * tt))
      .attr('opacity', 1);
  });

// make them all transparent
graph.selectAll('.yDot')
  .each(function (d,i) {
    d3.select(this)
      .transition()
      .delay((i+1) * tt)
      .attr('opacity', 0.1);
  });

graph.selectAll('.hLine')
  .each(function (d,i) {
    d3.select(this)
      .transition()
      .delay((i+1) * tt)
      .attr('opacity', 0.1);
  });

graph.selectAll('.vLine')
  .each(function (d,i) {
    d3.select(this)
      .transition()
      .delay((i+1) * tt)
      .attr('opacity', 0.1);
  });

graph.selectAll('.xDot')
  .each(function (d,i) {
    d3.select(this)
      .transition()
      .delay((i+1) * tt)
      .attr('opacity', 0.1);
  });



