mapboxgl.accessToken = 'pk.eyJ1Ijoic2FuazYiLCJhIjoiY203eXA3MW1zMGN1cDJxczF1OWd3Y2IwayJ9.3Zq1ApcFAPsu_x9fgPix0A';

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v10',
    center: [-2, 54],
    zoom: 5.5,
    pitch: 0,
    maxBounds: [
        [-11, 49], // Southwest coordinates
        [2, 62]  // Northeast coordinates
    ]
});

map.on('style.load', function () {
    map.setPitch(0);
    map.touchZoomRotate.disableRotation();
});

map.on('load', async function () {
    let ladData = await (await fetch('/lad.json')).json();
    let countyData = await (await fetch('/county.json')).json();

    for (let i = 0; i < ladData.features.length; i++) {
        const countyId = ladData.features[i].properties['LAD13CD'];
        const currCountyData = countyData.filter(({county}) => county === countyId).at(-1);
        let ratio = 0.5;

        if (currCountyData) ratio = currCountyData.appliedMajor / currCountyData.acceptedMajor;
        const g = Math.round(75 * ratio);
        const r = Math.round(200 * (1 - ratio));

        ladData.features[i].properties['countyInfo'] = countyData.filter(({county}) => county === countyId).at(-1);
        if (currCountyData) ladData.features[i].properties['color'] = `rgb(${r}, ${g}, 0)`;
        else ladData.features[i].properties['color'] = '#d3d3d3';
    }

    const key = 'LAD13NM';

    map.addSource('uk-counties', {
        type: 'geojson',
        data: ladData
    });

    map.addLayer({
        'id': 'uk-counties-layer',
        'type': 'fill',
        'source': 'uk-counties',
        'paint': {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.5,
            'fill-outline-color': '#004080'
        }
    });

    map.on('mouseenter', 'uk-counties-layer', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'uk-counties-layer', () => map.getCanvas().style.cursor = '');

    // Load Chart.js Plugin for Percentage Labels
    Chart.register(ChartDataLabels);

    // Initialize Pie Chart
    const ctx = document.getElementById('applications-chart').getContext('2d');
    let applicationsChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Rejected', 'Accepted'],
            datasets: [{
                label: 'Number of Applications',
                data: [0, 0],
                backgroundColor: ['#FF5733', '#33FF57']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                datalabels: {
                    color: '#fff',
                    font: {
                        weight: 'bold',
                        size: 16
                    },
                    formatter: (value, context) => {
                        let total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                        return total ? `${Math.round((value / total) * 100)}%` : '0%';
                    }
                }
            }
        }
    });

    function updateChart(countyInfo) {
        if (countyInfo) {
            let applied = countyInfo.appliedMajor;
            let accepted = countyInfo.acceptedMajor;
            let rejected = applied - accepted;

            applicationsChart.data.datasets[0].data = [rejected, accepted];
        } else {
            applicationsChart.data.datasets[0].data = [0, 0];
        }
        applicationsChart.update();
    }

    // Handle click event to display county information
    map.on('click', 'uk-counties-layer', (e) => {
        if (e.features.length > 0) {
            let properties = e.features[0].properties;
            let countyId = properties['LAD13CD'];

            // Get the latest available data for this county
            let countyEntries = countyData.filter(({ county }) => county === countyId);
            let latestCountyData = countyEntries.reduce((latest, current) => 
                current.year > (latest?.year || 0) ? current : latest, null);

            if (latestCountyData) {
                document.getElementById('county-name').innerText = properties[key];
                document.getElementById('county-year').innerText = `Year: ${latestCountyData.year}`;
                document.getElementById('major-applications').innerText = `Major Applications Applied: ${latestCountyData.appliedMajor}, Accepted: ${latestCountyData.acceptedMajor}`;

                updateChart(latestCountyData);
            } else {
                document.getElementById('county-name').innerText = properties[key];
                document.getElementById('county-year').innerText = 'No data available';
                document.getElementById('major-applications').innerText = '';

                updateChart(null);
            }
        }
    });
});
