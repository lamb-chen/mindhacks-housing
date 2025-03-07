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
            'fill-color': '#627BC1',
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
            let countyInfo = countyData.filter(({county}) => county === countyId);
            document.getElementById('county-name').innerText = properties[key];
            document.getElementById('county-info').innerText = JSON.stringify(countyInfo, null, 2);
        }
    });
});
