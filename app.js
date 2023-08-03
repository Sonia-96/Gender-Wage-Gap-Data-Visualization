let wageData = {}; // {year: {country: id, name, value}}
let countryData;
let map_url = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
window.onload = async function() {
    loadData().then(() => {
        d3.json(map_url).then(
            (data, error) => {
                if (error) {
                    console.log(error);
                } else {
                    countryData = topojson.feature(data, data.objects.countries).features; // convert topojson to GeoJson
                    console.log(wageData);
                    drawMap(2020);
                    drawLegend();
                    drawSlider();
                    drawBarChart(2020);
                }
            } 
        )
    })
}

async function loadData() {
    let text = await d3.text("employee_wage_gap.json");
    let jsonData = JSON.parse(text);
    for (let year in jsonData) {
        wageData[year] = {};
        for (key in jsonData[year]) {
            wageData[year][key] = jsonData[year][key];
        }
    }
}

const legendData = [10, 20, 50, 100, 500]
const legendColor = ['#fef0d9','#fdcc8a','#fc8d59','#e34a33','#b30000']

function drawLegend() {
    const colorScale = d3.scaleOrdinal().domain(legendData).range(legendColor);

    // Create the legend
    const legendSvg = d3.select("#legend").attr("width", 200).attr("height", 50);

    const legendWidth = 180; // Width of the legend excluding margins
    const legendHeight = 20; // Height of the color rectangles
    const legendMargin = { top: 10, left: 10 };

    // Create color rectangles in the legend
    const legendColors = legendSvg.selectAll("rect")
    .data(legendData) // Adjust the range based on your data values
    .enter()
    .append("rect")
    .attr("x", (d, i) => legendMargin.left + (i * (legendWidth / 5)))
    .attr("y", legendMargin.top)
    .attr("width", legendWidth / 3)
    .attr("height", legendHeight)
    .attr("fill", d => colorScale(d));

    // Add text labels beside the color rectangles
    const legendLabels = legendSvg.selectAll("text")
    .data(legendData) // Adjust the range based on your data values
    .enter()
    .append("text")
    .attr("x", (d, i) => legendMargin.left + (i * (legendWidth / 5)) + 20)
    .attr("y", legendMargin.top + legendHeight + 15)
    .text(d => d);
}

function drawSlider() {
    const slider = d3.sliderHorizontal()
    .min(1970)
    .max(2020)
    .step(1)
    .width(1000)
    .default(2020)
    .tickFormat(d3.format("d"))
    .on('onchange', (val) => {
        d3.select("#slider-value").text(val);
        cleanMap();
        drawMap(val);
    })

    d3.select('#slider')
        .append('svg')
        .attr('width', 1200)
        .attr('height', 100)
        .append('g')
        .attr('transform', 'translate(30,30)')
        .call(slider);
}

function getCountry(year, id) {
    let yearWageData = wageData[year]
    let country;
    for (key in yearWageData) {
        if (id != null && yearWageData[key]['id'] == id ) {
            country = yearWageData[key];
        }
    }
    return country;
}

function getWageGap(year, id) {
    let country = getCountry(year, id);
    return country === undefined ? 0 : country['value'];
}

function fillColor(value) {
    if (value == 0) {
        return '#ccc';
    }
    for (let i = 0; i < legendData.length; i++) {
        if (value < legendData[i]) {
            return legendColor[i];
        }
    }
}

function drawMap(year) {
    const width = 900;
    const height = 600;
    const svg = d3.select('#map').append('svg')
        .attr('id', 'world-map')
        .attr('width', '100%')
        .attr('height', '100%');
    const mapGroup = svg.append('g').attr("class", "countries");
    const zoom = d3.zoom()
        .scaleExtent([1, 3])
        .on('zoom', zoomed);
    svg.call(zoom);

    function zoomed(event) {
        mapGroup.attr('transform', event.transform);
    }
    // TODO can I scale the map according to the size of the screen?
    const projection = d3.geoMercator().scale(140).translate([width / 2, height / 1.4]);
    const path = d3.geoPath(projection);
    let tooltip = d3.select("#tooltip");

    mapGroup.selectAll('path').data(countryData).enter().append('path')
            .attr('d', path).attr('class', 'country')
            .attr('fill', (countryDataItem) => {
                let id = countryDataItem['id'];
                let value = getWageGap(year, id);
                return fillColor(value);
            })
            .attr('data-fips', (countryDataItem) => {
                return countryDataItem['id'];
            })
            .attr('data-wage', (countryDataItem) => {
                let id = countryDataItem['id'];
                let value = getWageGap(year, id);
                return value;
            })
            .on('mouseenter', () => {
                this.parentNode.append(this);
            })
            .on('mouseover', (event, countryDataItem) => {
                let id = countryDataItem['id'];
                let country = getCountry(year, id);
                if (country != undefined) {
                    d3.select("#name").text(country.name);
                    d3.select("#value").text(country.value);
                    d3.select("#year").text(year);
                    tooltip.transition()
                        .style('visibility', 'visible')
                        .style('left', (event.x + 10) + 'px')
                        .style('top', (event.y + 10) + 'px')
                        .style('opacity', 0.8);
                }
            })
            .on('mouseout', () => {
                tooltip.transition()
                    .style('visibility', 'hidden');
            })
}

function cleanMap() {
    const map = d3.select("#world-map");
    map.remove();
}

function drawBarChart(year) {
    let tooltip = d3.select("#tooltip");
    const temp = wageData[year]
    maxValue = 0;
    const yearWageData = []
    for (key in temp) {
        yearWageData.push([temp[key]['id'], key, temp[key]['value'], temp[key]['name']]);
        maxValue = Math.max(maxValue, temp[key]['value']);
    }
    yearWageData.sort((a, b) => b[2] - a[2]);

    // Chart dimensions
    const chartWidth = document.getElementById('barchart').offsetWidth - 20;
    const chartHeight = document.getElementById('barchart').offsetHeight - 30;

    // Create the SVG container for the chart
    const svg = d3.select('#barchart')
        .append('svg').attr('id', 'bar-chart')
        .attr('width', chartWidth)
        .attr('height', chartHeight);

    // Create a scale for the bar widths
    const xScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([0, chartWidth - 40]); // Leave some space for labels

    // Create the bars
    svg.selectAll('.bar')
        .data(yearWageData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('id', d => `bar-${d[0]}`)
        .attr('x', 70) // Start all bars from the left edge
        .attr('y', (d, i) => i * (chartHeight / yearWageData.length)) // Distribute bars evenly
        .attr('width', (d) => xScale(d[2]))
        .attr('height', chartHeight / yearWageData.length - 5) // Add some spacing between bars
        .attr('fill', (d) => fillColor(d[2]))
        .on('mouseover', (event, barDataItem) => {
            let id = barDataItem[0];
            let value = barDataItem[2];
            let name = barDataItem[3];
            d3.select("#name").text(name);
            d3.select("#value").text(value);
            d3.select("#year").text(year);
            tooltip.transition()
                .style('visibility', 'visible')
                .style('left', (event.x + 10) + 'px')
                .style('top', (event.y + 10) + 'px')
                .style('opacity', 0.8);

            const countryId = `#country-${id <= 99 ? 0 : ''}${barDataItem[0]}`;
            const country = d3.select(countryId);
            country.style('fill', 'yellow');
        })
        .on('mouseleave', (event, barDataItem) => {
            const countryId = `#country-${barDataItem[0] <= 99 ? 0 : ''}${barDataItem[0]}`;
            const country = d3.select(countryId);
            country.style('fill', fillColor(barDataItem[2]));
        })

    // Add labels to the bars
    svg.selectAll('.label')
        .data(yearWageData)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('x', 10) // Position the text at the end of each bar
        .attr('y', (d, i) => i * (chartHeight / yearWageData.length) + (chartHeight / yearWageData.length) / 2) // Vertically center the text
        .text((d) => d[1]) // Display the value of each bar as the label
        .attr('font-size', 15)

    const barChartBars = svg.selectAll('.bar');
    barChartBars.on('click', function(event,barDataItem)
    {
        let id = this.id.split("-");
        let barID = id[1];
        let country = getCountry(year, barID);
        d3.select(this)
            .attr("fill", "rgb(0," + this + ",0)")

        console.log(barDataItem);
        console.log(barID);
        console.log(typeof barID);
        console.log(year);
        console.log(country);

        //const countryToHighlight = d3.select(country);
        const countryToHighlight = d3.select(`#country-${barID}`);
        countryToHighlight.classed('highlighted', true);

        //let currentState = countryToHighlight.classed('highlighted')
        //countryToHighlight.classed('highlighted', !currentState);

    });

    const deselectBarChartBars = svg.selectAll('.bar');
    barChartBars.on('dblclick', function(event,deselectBarChartBars)
    {
        let id = this.id.split("-");
        let barID = id[1];
        let country = getCountry(year, barID);
        let value = getWageGap(year, barID);
        let color = fillColor(value);
        d3.select(this)
            .attr("fill", color);

    });
}

