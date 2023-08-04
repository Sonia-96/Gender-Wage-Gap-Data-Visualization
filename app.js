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
                    drawBarChart(2020);
                    drawSlider();
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
        cleanBarChart();
        drawBarChart(val);
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

let tooltip = d3.select("#tooltip");

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
    const projection = d3.geoMercator().scale(120).translate([width / 2, height / 1.72]);
    const path = d3.geoPath(projection);

    mapGroup.selectAll('path').data(countryData).enter().append('path')
            .attr('d', path).attr('class', 'country')
            .attr('id', (countryDataItem) => `country-${d3.format('d')(countryDataItem['id'])}`)
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

                const barId = `#bar-${id}`;
                const bar = d3.select(barId);
                bar.style('fill', "#0066cc");
            })
            .on('mouseout', (event, countryDataItem) => {
                tooltip.transition()
                    .style('visibility', 'hidden');

                let id = countryDataItem['id'];
                let value =  countryDataItem['value'];
                const barId = `#bar-${id}`;
                const bar = d3.select(barId);
                bar.style('fill', fillColor(value));
            })
            .on('click', (event, countryDataItem) => {
                let id = countryDataItem['id'];
                const barId = `#bar-${id}`;
                const bar = d3.select(barId);
                bar.classed('highlighted', !bar.classed("highlighted"));
    
                const countryId = `#country-${id}`;
                const country = d3.select(countryId);
                country.classed('highlighted', !country.classed('highlighted'));
                if (country.classed('highlighted')) {
                    country.style('fill', '#0066cc');
                } else {
                    country.style('fill', fillColor(value));
                }
            })
}

function cleanMap() {
    const map = d3.select("#world-map");
    map.remove();
}

function drawBarChart(year) {
    const temp = wageData[year]
    maxValue = 0;
    const yearWageData = []
    for (key in temp) {
        let barData = {
            'id': temp[key]['id'],
            'acronym': key,
            'name': temp[key]['name'],
            'value': temp[key]['value'],

        };
        yearWageData.push(barData);
        maxValue = Math.max(maxValue, barData['value']);
    }
    yearWageData.sort((a, b) => b.value - a.value);
    console.log(yearWageData);

    // Chart dimensions
    const chartWidth = document.getElementById('barchart').offsetWidth - 30;
    const chartHeight = document.getElementById('barchart').offsetHeight - 30;

    // Create the SVG container for the chart
    const svg = d3.select('#barchart')
        .append('svg').attr('id', 'bar-chart')
        .attr('width', chartWidth)
        .attr('height', chartHeight);

    // Create a scale for the bar widths
    const xScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([0, chartWidth - 100]); // Leave some space for labels


    // Create the bars
    svg.selectAll('.bar')
        .data(yearWageData)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('id', d => `bar-${d['id']}`)
        .attr('x', 50) // Start all bars from the left edge
        .attr('y', (d, i) => i * (chartHeight / yearWageData.length)) // Distribute bars evenly
        .attr('width', (d) => xScale(d['value']))
        .attr('height', chartHeight / yearWageData.length - 5) // Add some spacing between bars
        .attr('fill', (d) => fillColor(d['value']))
        .on('mouseover', (event, barDataItem) => {
            let id = barDataItem['id'];
            let value = barDataItem['value'];
            let name = barDataItem['name'];
            d3.select("#name").text(name);
            d3.select("#value").text(value);
            d3.select("#year").text(year);
            tooltip.transition()
                .style('visibility', 'visible')
                .style('left', (event.x + 10) + 'px')
                .style('top', (event.y + 10) + 'px')
                .style('opacity', 0.8);

            const countryId = `#country-${id}`;
            const country = d3.select(countryId);
            country.style('fill', '#0066cc');
        })
        .on('mouseleave', (event, barDataItem) => {
            tooltip.transition()
                    .style('visibility', 'hidden');
            const countryId = `#country-${barDataItem['id']}`;
            const country = d3.select(countryId);
            const isHighlighted = country.classed("highlighted");
            if (!isHighlighted) {
                country.style('fill', fillColor(barDataItem['value']));
            }
        })
        .on('click', (event, barDataItem) => {
            let id = barDataItem['id'];
            const barId = `#bar-${id}`;
            const bar = d3.select(barId);
            bar.classed('highlighted', !bar.classed("highlighted"));

            const countryId = `#country-${id}`;
            const country = d3.select(countryId);
            country.classed('highlighted', !country.classed('highlighted'));
        })
            
        

    // Add labels to the bars
    svg.selectAll('.label')
        .data(yearWageData)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('x', 5) // Position the text at the end of each bar
        .attr('y', (d, i) => i * (chartHeight / yearWageData.length) + (chartHeight / yearWageData.length) / 2) // Vertically center the text
        .text((d) => d['acronym']) // Display the value of each bar as the label
        .attr('font-size', 15)

    // Add labels to the bars
    svg.selectAll('.bar-value')
        .data(yearWageData)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('x', d => xScale(d['value']) + 60) // Position the text at the end of each bar
        .attr('y', (d, i) => i * (chartHeight / yearWageData.length) + (chartHeight / yearWageData.length) / 2) // Vertically center the text
        .text((d) => d['value']) // Display the value of each bar as the label
        .attr('font-size', 15)
        
}

function cleanBarChart() {
    d3.selectAll("#bar-chart").remove();
}

