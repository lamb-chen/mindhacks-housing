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
    let schoolData = await (await fetch('/schools.json')).json();
    let homeOwnershipData = await (await fetch('/homeownership.json')).json();
    let priceChangeData = await (await fetch('/pricechange.json')).json();

    const key = 'LAD13NM';

    // Calculate average acceptance ratio for color scaling
    let totalAccepted = 0, totalApplied = 0;
    for (let i = 0; i < ladData.features.length; i++) {
        const countyId = ladData.features[i].properties['LAD13CD'];
        const currCountyData = countyData.filter(({ county }) => county === countyId).at(-1);
        if (currCountyData) {
            totalAccepted += currCountyData.acceptedMajor;
            totalApplied += currCountyData.appliedMajor;
        }
    }
    let averageRatio = totalAccepted / totalApplied;

    // Assign color based on acceptance ratio
    for (let i = 0; i < ladData.features.length; i++) {
        const countyId = ladData.features[i].properties['LAD13CD'];
        const currCountyData = countyData.filter(({ county }) => county === countyId).at(-1);
        let ratio = 0.5;
        if (currCountyData) ratio = (currCountyData.appliedMajor / currCountyData.acceptedMajor) - averageRatio;
        const r = Math.round(255 * ratio);
        const g = Math.round(255 * (1 - ratio));
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
    })

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

            const countyName = properties[key];
            const schoolEntry = schoolData.find(school => school.localAuthority === countyName);
            const homeownershipEntry = homeOwnershipData.find(e => e["Area code"] === countyId);

            const priceChangeDataEntry = priceChangeData.find(e => e["AreaCode"] === countyId);
            let rentToOwnershipRatio = 0;
            if (homeownershipEntry) {
                const totalOwned = homeownershipEntry["Owned: Owns outright (number)"] + homeownershipEntry["Owned: Owns with a mortgage or loan or shared ownership (number)"];
                const totalRented = homeownershipEntry["Rented: Social rented (number)"] + homeownershipEntry["Private rented or lives rent free (number)"];
                rentToOwnershipRatio = totalRented / totalOwned;
            }
            rentToOwnershipRatio = rentToOwnershipRatio;

            if (latestCountyData) {
                document.getElementById('county-name').innerText = properties[key];
                document.getElementById('county-year').innerText = `Year: ${latestCountyData.year}`;
                if (schoolEntry) document.getElementById('school-text').innerText = `School Capacity: ${schoolEntry.usedCapacityPercent.toFixed(1)}%`;
                else document.getElementById('school-text').innerText = '';
                if (homeownershipEntry) document.getElementById('homeownership-text').innerText = `Home Ownership to Renting Ratio: ${(rentToOwnershipRatio * 100).toFixed(1)}%`;
                else document.getElementById('homeownership-text').innerText = '';
                if (priceChangeDataEntry) document.getElementById('pricechange-text').innerText = `House Price Change: ${priceChangeDataEntry["YearlyChange"]}%`;
                else document.getElementById('pricechange-text').innerText = '';
                updateChart(latestCountyData);
            } else {
                document.getElementById('county-name').innerText = properties[key];
                document.getElementById('county-year').innerText = 'No data available';
                if (schoolEntry) document.getElementById('school-text').innerText = `School Capacity: ${schoolEntry.usedCapacityPercent.toFixed(1)}%`;
                else document.getElementById('school-text').innerText = '';
                if (homeownershipEntry) document.getElementById('homeownership-text').innerText = `Home Ownership: ${(rentToOwnershipRatio * 100).toFixed(1)}%`;
                else document.getElementById('homeownership-text').innerText = '';
                if (priceChangeDataEntry) document.getElementById('pricechange-text').innerText = `House Price Change: ${priceChangeDataEntry["YearlyChange"]}%`;
                else document.getElementById('pricechange-text').innerText = '';
                updateChart(null);
            }
        }
    });
});
