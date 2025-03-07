mapboxgl.accessToken = 'pk.eyJ1Ijoic2FuazYiLCJhIjoiY203eXA3MW1zMGN1cDJxczF1OWd3Y2IwayJ9.3Zq1ApcFAPsu_x9fgPix0A';

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v10',
    center: [-2, 54],
    zoom: 5.5,
    pitch: 0,
});

// Load JSON from '/lad.json' and add it to the map
const geoJson = fetch('/lad.json')

map.on('load', async function () {
    let data = await (await geoJson).json();

    map.addSource('uk-counties', {
        type: 'geojson',
        data
    });

    map.addLayer({
        'id': 'uk-counties-layer',
        'type': 'fill',
        'source': 'uk-counties',
        'paint': {
            'fill-color': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                '#627BC1',
                '#4464bd'
            ],
            'fill-opacity': 0.5,
            'fill-outline-color': '#004080'
        }
    });

    map.addLayer({
        'id': 'uk-counties-borders',
        'type': 'line',
        'source': 'uk-counties',
        'layout': {},
        'paint': {
            'line-color': '#004080',
            'line-width': 2
        }
    });

    map.on('mouseenter', 'uk-counties-layer', () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', 'uk-counties-layer', () => map.getCanvas().style.cursor = '');

    // Handle click event to display county information
    map.on('click', 'uk-counties-layer', (e) => {
        if (e.features.length > 0) {
            var properties = e.features[0].properties;
            var infoHtml = '<h3>' + properties["LAD13NM"] + '</h3>';
            infoHtml += JSON.stringify(properties, null, 2);
            document.getElementById('county-info').innerHTML = infoHtml;
        }
    });
});
