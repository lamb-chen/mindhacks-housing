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

map.on('style.load', function() {
    map.setPitch(0);
    map.touchZoomRotate.disableRotation();
});


map.on('load', async function () {
    let ladData = await (await fetch('/lad.json')).json();
    let eerData = await (await fetch('/eer.json')).json();
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

    // Handle click event to display county information
    map.on('click', 'uk-counties-layer', (e) => {
        if (e.features.length > 0) {
            let properties = e.features[0].properties;
            let countyId = properties['LAD13CD'];
            let countyInfo = countyData.filter(({county}) => county === countyId).at(-1);
            document.getElementById('county-name').innerText = properties[key];
            document.getElementById('county-info').innerText = JSON.stringify(countyInfo, null, 2);
        }
    });
});
