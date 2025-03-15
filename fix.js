const fs = require('fs');

// Читаем файл
let content = fs.readFileSync('Frontend/js/report-editor.js', 'utf8');

// Заменяем метрики
let updatedContent = content.replace(
  /\/\/ Initialize metrics\s+if \(currentTemplate\.configuration\.metrics\) \{\s+currentTemplate\.configuration\.metrics\.forEach\(metricId => \{\s+addMetricToReport\(metricId\);\s+\}\);\s+\} else \{\s+currentTemplate\.configuration\.metrics = \[\];\s+\}/g,
  '// Initialize metrics array but dont add any to the report\n        if (\!currentTemplate.configuration.metrics) {\n            currentTemplate.configuration.metrics = [];\n        }'
);

// Заменяем загрузку графиков (находим начало и конец блока)
const chartLoadStartPattern = /\/\/ Load charts\s+currentTemplate\.configuration\.charts\.forEach\(chartConfig => {/;
const chartLoadStart = updatedContent.match(chartLoadStartPattern);

if (chartLoadStart) {
  const startIndex = chartLoadStart.index;
  
  // Находим конец блока кода (закрывающую скобку и точку с запятой)
  let bracketCount = 0;
  let endIndex = -1;
  
  for (let i = startIndex; i < updatedContent.length; i++) {
    if (updatedContent[i] === '{') bracketCount++;
    else if (updatedContent[i] === '}') {
      bracketCount--;
      if (bracketCount === 0 && updatedContent[i+1] === ')' && updatedContent[i+2] === ';') {
        endIndex = i + 3;
        break;
      }
    }
  }
  
  if (endIndex > 0) {
    // Заменяем весь блок
    const beforeBlock = updatedContent.substring(0, startIndex);
    const afterBlock = updatedContent.substring(endIndex);
    
    updatedContent = 
      beforeBlock + 
      '// No charts to load - custom charts will be added by the user' + 
      afterBlock;
    
    console.log('Chart loading code replaced successfully\!');
  } else {
    console.log('Could not find the end of chart loading block');
  }
} else {
  console.log('Chart loading pattern not found');
}

// Записываем обновленный файл
fs.writeFileSync('Frontend/js/report-editor.js', updatedContent, 'utf8');
console.log('File updated successfully\!');

// Проверяем, что файл был правильно обновлен
const finalContent = fs.readFileSync('Frontend/js/report-editor.js', 'utf8');
const metricsCheck = finalContent.includes('// Initialize metrics array but dont add any to the report');
const chartsCheck = finalContent.includes('// No charts to load - custom charts will be added by the user');

console.log('Metrics updated:', metricsCheck);
console.log('Charts updated:', chartsCheck);
