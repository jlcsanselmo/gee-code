var roi = ee.FeatureCollection('projects/gee-trial2/assets/Shapfile/WMH_Distric') // assent presente no GEE 
    .filter(ee.Filter.eq('dt_code', 527));
Map.centerObject(roi, 6);

var sentinel = ee.ImageCollection('COPERNICUS/S2_SR')
    .filterBounds(roi)
    .filterDate('2023-01-01', '2023-12-31') // definir datas de interesse
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10));
// seleção de bandas
var computeNDVI = function(image) {
    var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
    return image.addBands(ndvi).set('system:time_start', image.get('system:time_start'));
};
var ndviCollection = sentinel.map(computeNDVI);
// CALCULO DO NDVI / EMISSIVIDADE
var computeEmissivity = function(image) {
    var ndvi = image.select('NDVI');
    var emissivity = ndvi.expression(
        "(NDVI < 0.2) ? 0.97 : (NDVI > 0.5) ? 0.99 : (0.004 * NDVI + 0.986)", 
        { 'NDVI': ndvi }
    ).rename('Emissivity');
    return image.addBands(emissivity);
};
var emissivityCollection = ndviCollection.map(computeEmissivity);

var startDate = ee.Date('2023-01-01');
var endDate = ee.Date('2023-12-31');
var interval = 16;

var timeSeries = ee.ImageCollection(
    ee.List.sequence(0, endDate.difference(startDate, 'day').subtract(interval), interval).map(function(dayOffset) {
        var start = startDate.advance(dayOffset, 'day');
        var end = start.advance(interval, 'day');
        var filtered = emissivityCollection.filterDate(start, end);
        return filtered.mean().set('date', start.format('YYYY-MM-dd'));
    })
);

var chart = ui.Chart.image.series({
    imageCollection: timeSeries.select(['NDVI', 'Emissivity']),
    region: roi,
    reducer: ee.Reducer.mean(),
    scale: 1000,
    xProperty: 'date'
}).setOptions({
    title: '16-Day Time Series of NDVI & Emissivity (2023)',
    hAxis: { title: 'Date', format: 'YYYY-MM-dd', gridlines: { count: 10 } },
    vAxis: { title: 'Value' },
    series: {
        0: { color: 'green', label: 'NDVI' },
        1: { color: 'red', label: 'Emissivity' }
    }
});
print(chart);

var medianEmissivity = emissivityCollection.select('Emissivity').median();
Map.addLayer(medianEmissivity.clip(roi), visParamsEmissivity, 'Median Emissivity');
// EXPORTAÇÃO DO IMAGEM
Export.image.toDrive({
    image: medianEmissivity,
    description: 'Sentinel2_Emissivity',
    scale: 30,
    region: roi,
    fileFormat: 'GeoTIFF',
    maxPixels: 1e13
});
// function para aplicar legenda ao mapa
function addLegend() {
    var legend = ui.Panel({ style: { position: 'bottom-left', padding: '8px 15px' } });
    var title = ui.Label({
        value: 'Emissivity Legend',
        style: { fontWeight: 'bold', fontSize: '14px', margin: '0 0 4px 0', padding: '0' }
    });

    var colors = ['blue', 'yellow', 'red'];
    var labels = ['Low (<0.97)', 'Medium (0.97 - 0.98)', 'High (>0.98)'];
    var list = ui.Panel({ layout: ui.Panel.Layout.flow('vertical') });

    for (var i = 0; i < colors.length; i++) {
        var colorBox = ui.Label({ style: { backgroundColor: colors[i], padding: '8px', margin: '4px' } });
        var description = ui.Label({ value: labels[i], style: { margin: '4px 0 4px 6px' } });
        var row = ui.Panel({ widgets: [colorBox, description], layout: ui.Panel.Layout.flow('horizontal') });
        list.add(row);
    }

    legend.add(title);
    legend.add(list);
    Map.add(legend);
}
addLegend();
