const fs = require('fs');
let content = fs.readFileSync('Frontend/js/report-editor.js', 'utf8');

// Заменяем блок инициализации метрик
content = content.replace(
  /\/\/ Initialize metrics\s+if \(currentTemplate\.configuration\.metrics\) \{\s+currentTemplate\.configuration\.metrics\.forEach\(metricId => \{\s+addMetricToReport\(metricId\);\s+\}\);\s+\} else \{\s+currentTemplate\.configuration\.metrics = \[\];\s+\}/g,
  '// Initialize metrics array but dont add any to the report\n        if (\!currentTemplate.configuration.metrics) {\n            currentTemplate.configuration.metrics = [];\n        }'
);

// Заменяем строку с загрузкой графиков в функции loadTemplate
const chartLoadStart = content.indexOf('// Load charts', 4680);
if (chartLoadStart > 0) {
  const beforeCharts = content.substring(0, chartLoadStart);
  const afterCharts = content.substring(chartLoadStart);
  
  // Заменяем только заголовок
  const replacedCharts = afterCharts.replace(
    '// Load charts',
    '// No charts to load - custom charts will be added by the user'
  );
  
  content = beforeCharts + replacedCharts;
  
  console.log('Chart loading text replaced\!');
}

// Записываем обновленный файл
fs.writeFileSync('Frontend/js/report-editor.js', content, 'utf8');
console.log('File updated successfully\!');
