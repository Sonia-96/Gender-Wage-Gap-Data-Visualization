let wageData = {}; // {year: {country: value}}
let countryData;
window.onload = async function() {
    loadData().then(() => {
        let map_url = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
        d3.json(map_url).then(
            (data, error) => {
                if (error) {
                    console.log(error);
                } else {
                    countryData = topojson.feature(data, data.objects.countries).features; // convert topojson to GeoJson
                    console.log(wageData);
                    drawMap(2020);
                    drawLegend();
                }
            } 
        )
    })
}

function fillColor(value) {
    if (value == 0) {
        return '#ccc';
    } else if (value < 10) {
        return 'orange';
    } else if (value < 20) {
        return 'tomato';
    } else {
        return 'red';
    }
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

function drawMap(year) {
    const width = 900;
    const height = 600;
    const svg = d3.select('#map').append('svg').attr('width', '100%').attr('height', '100%');
    const projection = d3.geoMercator().scale(140)
        .translate([width / 2, height / 1.4]);
    const path = d3.geoPath(projection);
    let tooltip = d3.select("#tooltip");
    svg.selectAll('path').data(countryData).enter().append('path')
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
            .on('mouseover', (event, countryDataItem) => {
                let id = countryDataItem['id'];
                let country = getCountry(year, id);
                if (country != undefined) {
                    d3.select("#name").text(country.name);
                    d3.select("#value").text(country.value);
                    d3.select("#year").text(year);
                    tooltip.transition()
                        .style('visibility', 'visible')
                        .style('left', (event.x + 20) + 'px')
                        .style('top', (event.y + 20) + 'px')
                        .style('opacity', 0.8)
                }
            })
            .on('mouseout', (countryDataItem) => {
                tooltip.transition()
                    .style('visibility', 'hidden');
            })
}

function drawLegend() {
    const svg = d3.select('#map').append('svg');
    labels = ["< 10", "< 20", ">20"];

}
