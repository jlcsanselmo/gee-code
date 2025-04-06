// coleção MapBiomas (Coleção 9)
var mapBiomas = ee.Image('projects/mapbiomas-public/assets/brazil/lulc/collection9/mapbiomas_collection90_integration_v1');

// Área de Interesse (substitua pelo ID do seu asset)
var roi = ee.FeatureCollection('projects/ee-jlcsanselmo/assets/AOI_COCAL');  

// Definir o ano desejado
var ano = 2022;
var cobertura = mapBiomas.select('classification_' + ano).clip(roi);

// Dicionário com os códigos, nomes e cores da legenda oficial do MapBiomas (Coleção 9)
var legendaMapBiomas = {
  0: {nome: 'Não Classificado', cor: '#ffffff'},
  1: {nome: 'Floresta', cor: '#1f8d49'},
  3: {nome: 'Formação Florestal', cor: '#1f8d49'},
  4: {nome: 'Formação Savânica', cor: '#7dc975'},
  5: {nome: 'Mangue', cor: '#04381d'},
  6: {nome: 'Floresta Alagável', cor: '#007785'},
  9: {nome: 'Silvicultura', cor: '#7a5900'},
  10: {nome: 'Vegetação Herbácea e Arbustiva', cor: '#d6bc74'},
  11: {nome: 'Campo Alagado e Área Pantanosa', cor: '#519799'},
  12: {nome: 'Formação Campestre', cor: '#d6bc74'},
  14: {nome: 'Agropecuária', cor: '#ffefc3'},
  15: {nome: 'Pastagem', cor: '#edde8e'},
  18: {nome: 'Agricultura', cor: '#E974ED'},
  19: {nome: 'Lavoura Temporária', cor: '#C27BA0'},
  20: {nome: 'Cana', cor: '#db7093'},
  21: {nome: 'Mosaico de Usos', cor: '#ffefc3'},
  22: {nome: 'Área Não Vegetada', cor: '#d4271e'},
  23: {nome: 'Praia, Duna e Areal', cor: '#ffa07a'},
  24: {nome: 'Área Urbanizada', cor: '#d4271e'},
  25: {nome: 'Outras Áreas Não Vegetadas', cor: '#db4d4f'},
  26: {nome: 'Corpo D’água', cor: '#2532e4'},
  27: {nome: 'Não Observado', cor: '#ffffff'},
  29: {nome: 'Afloramento Rochoso', cor: '#ffaa5f'},
  30: {nome: 'Mineração', cor: '#9c0027'},
  31: {nome: 'Aquicultura', cor: '#091077'},
  32: {nome: 'Apicum', cor: '#fc8114'},
  33: {nome: 'Rio, Lago e Oceano', cor: '#2532e4'},
  35: {nome: 'Dendê', cor: '#9065d0'},
  36: {nome: 'Lavoura Perene', cor: '#d082de'},
  39: {nome: 'Soja', cor: '#f5b3c8'},
  40: {nome: 'Arroz', cor: '#c71585'},
  41: {nome: 'Outras Lavouras Temporárias', cor: '#f54ca9'},
  46: {nome: 'Café', cor: '#d68fe2'},
  47: {nome: 'Citrus', cor: '#9932cc'},
  48: {nome: 'Outras Lavouras Perenes', cor: '#e6ccff'},
  49: {nome: 'Restinga Arbórea', cor: '#02d659'},
  50: {nome: 'Restinga Herbácea', cor: '#ad5100'},
  62: {nome: 'Algodão (beta)', cor: '#ff69b4'}
};

// Calcular a área de cada classe dentro da ROI
var areaPorClasse = cobertura.reduceRegion({
  reducer: ee.Reducer.frequencyHistogram(),
  geometry: roi,
  scale: 30,
  maxPixels: 1e13
});

// Verifica se o histograma foi gerado corretamente
print("📌 Resultado do reduceRegion:", areaPorClasse);
var histograma = ee.Dictionary(areaPorClasse.get('classification_' + ano));

print("📌 Códigos de classificação na ROI:", histograma.keys());

// Converter contagem de pixels para hectares (1 pixel = 30m x 30m = 900m² = 0,09 ha)
var pixelAreaHa = ee.Number(30).multiply(30).divide(10000);

// Se histograma for `null` ou `undefined`, criamos um dicionário vazio para evitar erro
var areaClassesHa = ee.Dictionary(ee.Algorithms.If(
  histograma,  
  histograma.map(function(chave, valor) {
    return ee.Number(valor).multiply(pixelAreaHa).round();
  }),
  ee.Dictionary({})
));

print("📊 Áreas calculadas por classe:", areaClassesHa);

// Cria uma tabela formatada para exibição no console
var tabelaFormatada = ee.List(areaClassesHa.keys()).map(function(chave) {
  chave = ee.Number.parse(chave);
  var classeInfo = ee.Dictionary(legendaMapBiomas).get(chave);
  var nomeClasse = ee.Algorithms.If(classeInfo, ee.Dictionary(classeInfo).get('nome'), 'Desconhecido');
  var area = ee.Number(areaClassesHa.get(chave));
  return {
    'Código': chave, 
    'Classe': nomeClasse,
    'Área (ha)': area
  };
});

print('📊 Tabela de Áreas por Classe (MapBiomas - Coleção 9) em hectares:', tabelaFormatada);

//  Cria um FeatureCollection para exportação
var tabelaExport = ee.FeatureCollection(areaClassesHa.map(function(chave, valor) {
  chave = ee.Number.parse(chave);
  var classeInfo = ee.Dictionary(legendaMapBiomas).get(chave);
  var nomeClasse = ee.Algorithms.If(classeInfo, ee.Dictionary(classeInfo).get('nome'), 'Desconhecido');
  return ee.Feature(null, {'Código': chave, 'Classe': nomeClasse, 'Área (ha)': valor});
}));

// Cria um FeatureCollection para exportação
var listaFeatures = areaClassesHa.keys().map(function(chave) {
  chave = ee.Number.parse(chave);
  var classeInfo = ee.Dictionary(legendaMapBiomas).get(chave);
  var nomeClasse = ee.Algorithms.If(classeInfo, ee.Dictionary(classeInfo).get('nome'), 'Desconhecido');
  var area = ee.Number(areaClassesHa.get(chave));
  
  return ee.Feature(null, {
    'Código': chave, 
    'Classe': nomeClasse, 
    'Área (ha)': area
  });
});

// Cria a FeatureCollection corretamente
var tabelaExport = ee.FeatureCollection(listaFeatures);

print("📂 FeatureCollection gerada:", tabelaExport);

// Cria um gráfico de pizza das áreas por classe (com nomes)
var chart = ui.Chart.array.values({
  array: areaClassesHa.values(),  // Valores das áreas em hectares
  axis: 0,  // Índice do eixo dos valores
  xLabels: areaClassesHa.keys().map(function(chave) {
    chave = ee.Number.parse(chave);
    var classeInfo = ee.Dictionary(legendaMapBiomas).get(chave);
    return ee.Algorithms.If(classeInfo, ee.Dictionary(classeInfo).get('nome'), 'Desconhecido');
  }).getInfo()  // Obtém a lista de nomes das classes
}).setChartType('PieChart')  // Define o tipo como pizza
  .setOptions({
    title: 'Distribuição das Classes - MapBiomas (Coleção 9)',
    sliceVisibilityThreshold: 0.01,  // Ocultar fatias muito pequenas
    colors: areaClassesHa.keys().map(function(chave) {
      chave = ee.Number.parse(chave);
      var classeInfo = ee.Dictionary(legendaMapBiomas).get(chave);
      return ee.Algorithms.If(classeInfo, ee.Dictionary(classeInfo).get('cor'), '#000000');
    }).getInfo()  // Obtém a lista de cores das classes
  });

// Exibir o gráfico no console
print(chart);

// Exportar tabela para Google Drive
Export.table.toDrive({
  collection: tabelaExport,
  description: 'Area_Classes_MapBiomas_Colecao9_2022',
  fileFormat: 'CSV'
});

// Exportar o raster recortado (MapBiomas dentro da ROI)
Export.image.toDrive({
  image: cobertura,  // A imagem recortada do MapBiomas
  description: 'MapBiomas_Recorte_Colecao9_2022',
  folder: 'MapBiomas_Export', // Pasta no Google Drive (opcional)
  fileNamePrefix: 'MapBiomas_Recorte_2022', // Nome do arquivo
  region: roi.geometry(), // Definição da área de exportação
  scale: 30, // Resolução espacial
  maxPixels: 1e13, // Número máximo de pixels permitido
  fileFormat: 'GEOTIFF' // Define o formato como Shapefile
});

//  Adiciona a camada do MapBiomas ao mapa
var paletaCores = Object.keys(legendaMapBiomas).map(function(chave) {
  return legendaMapBiomas[chave].cor;
});
var visParams = {min: 0, max: 62, palette: paletaCores};

Map.centerObject(roi, 10);
Map.addLayer(cobertura, visParams, 'MapBiomas 2022');
Map.addLayer(roi, {color: 'red'}, 'ROI');

// Cria a legenda no mapa
var legend = ui.Panel({style: {position: 'bottom-left', padding: '8px 15px'}});
legend.add(ui.Label({value: '📌 Legenda - MapBiomas Coleção 9', style: {fontWeight: 'bold', fontSize: '14px'}}));

Object.keys(legendaMapBiomas).forEach(function(key) {
  var classe = legendaMapBiomas[key];
  var colorBox = ui.Label({style: {backgroundColor: classe.cor, padding: '8px', margin: '4px', color: 'white'}});
  var label = ui.Label(classe.nome, {margin: '4px 0px 4px 6px'});
  var panel = ui.Panel({widgets: [colorBox, label], layout: ui.Panel.Layout.Flow('horizontal')});
  legend.add(panel);
});

Map.add(legend);
