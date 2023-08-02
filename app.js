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

