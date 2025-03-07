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
    let schoolData = await (await fetch('/schools.json')).json(); // Load school data

    const key = 'LAD13NM';
    let currentView = 'housing'; // Default view

    // Calculate average acceptance ratio for color scaling
    let totalAccepted = 0, totalApplied = 0;
    for (let i = 0; i < ladData.features.length; i++) {
        const countyId = ladData.features[i].properties['LAD13CD'];
        const currCountyData = countyData.filter(({county}) => county === countyId).at(-1);
        if (currCountyData) {
            totalAccepted += currCountyData.acceptedMajor;
            totalApplied += currCountyData.appliedMajor;
        }
    }
    let averageRatio = totalAccepted / totalApplied;

    // Assign color based on acceptance ratio
    for (let i = 0; i < ladData.features.length; i++) {
        const countyId = ladData.features[i].properties['LAD13CD'];
        const currCountyData = countyData.filter(({county}) => county === countyId).at(-1);
        let ratio = 0.5;
        if (currCountyData) ratio = (currCountyData.appliedMajor / currCountyData.acceptedMajor) - averageRatio;
        const g = Math.round(255 * ratio);
        const r = Math.round(255 * (1 - ratio));
        ladData.features[i].properties['countyInfo'] = currCountyData;
        ladData.features[i].properties['color'] = currCountyData ? `rgb(${r}, ${g}, 0)` : '#d3d3d3';
    }

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
                    font: { weight: 'bold', size: 16 },
                    formatter: (value, context) => {
                        let total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                        return total ? `${Math.round((value / total) * 100)}%` : '0%';
                    }
                }
            }
        }
    });

    function updateChart(data) {
        if (currentView === 'housing' && data) {
            let applied = data.appliedMajor;
            let accepted = data.acceptedMajor;
            let rejected = applied - accepted;

            applicationsChart.data.labels = ['Rejected', 'Accepted'];
            applicationsChart.data.datasets[0].label = 'Major Applications';
            applicationsChart.data.datasets[0].data = [rejected, accepted];
            applicationsChart.data.datasets[0].backgroundColor = ['#FF5733', '#33FF57'];
        } 
        else if (currentView === 'schools' && data) {
            let withinCapacity = Math.min(100, data.usedCapacityPercent);
            let overCapacity = Math.max(0, data.usedCapacityPercent - 100);

            applicationsChart.data.labels = ['Within Capacity', 'Over Capacity'];
            applicationsChart.data.datasets[0].label = 'School Capacity';
            applicationsChart.data.datasets[0].data = [withinCapacity, overCapacity];
            applicationsChart.data.datasets[0].backgroundColor = ['#33FF57', '#FF5733'];
        } 
        else {
            applicationsChart.data.labels = [];
            applicationsChart.data.datasets[0].data = [];
        }
        console.log(applicationsChart.data.datasets[0].data);
        applicationsChart.update();
    }

    function displayData(properties) {
        let countyId = properties['LAD13CD'];
        let countyName = properties[key];

        if (currentView === 'housing') {
            let countyEntries = countyData.filter(({ county }) => county === countyId);
            let latestCountyData = countyEntries.reduce((latest, current) => 
                current.year > (latest?.year || 0) ? current : latest, null);

            if (latestCountyData) {
                document.getElementById('county-name').innerText = countyName;
                document.getElementById('county-year').innerText = `Year: ${latestCountyData.year}`;
                document.getElementById('info-text').innerText = 
                    `Major Applied: ${latestCountyData.appliedMajor}, Accepted: ${latestCountyData.acceptedMajor}`;
                updateChart(latestCountyData);
            }
        } else if (currentView === 'schools') {
            let schoolEntry = schoolData.find(school => school.localAuthority === countyName);
            
            if (schoolEntry) {
                document.getElementById('county-name').innerText = countyName;
                // document.getElementById('county-year').innerText = `Region: ${schoolEntry.localAuthority}`;
                document.getElementById('info-text').innerText = 
                    `Admissions: ${schoolEntry.admissionNumbers}, Offers: ${schoolEntry.totalOffers} \n Capacity: ${schoolEntry.usedCapacityPercent}%`;
                updateChart(schoolEntry);
            }
        }
    }

    map.on('click', 'uk-counties-layer', (e) => {
        if (e.features.length > 0) {
            displayData(e.features[0].properties);
        }
    });

    // Toggle between Housing & Schools
    document.getElementById('toggle-housing').addEventListener('click', () => {
        currentView = 'housing';
        document.getElementById('chart-title').innerText = 'Housing Data';
    });

    document.getElementById('toggle-schools').addEventListener('click', () => {
        currentView = 'schools';
        document.getElementById('chart-title').innerText = 'School Data';
    });
});
