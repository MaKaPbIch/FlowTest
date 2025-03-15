var fs = require('fs');

// Read the file
var content = fs.readFileSync('Frontend/js/report-editor.js', 'utf8');

// Replace metrics loading
content = content.replace(
    /\/\/ Initialize metrics\s+if \(currentTemplate\.configuration\.metrics\) {\s+currentTemplate\.configuration\.metrics\.forEach\(metricId => {\s+addMetricToReport\(metricId\);\s+}\);\s+} else {\s+currentTemplate\.configuration\.metrics = \[\];\s+}/,
    '// Initialize metrics array but dont add any to the report\n        if (\!currentTemplate.configuration.metrics) {\n            currentTemplate.configuration.metrics = [];\n        }'
);

// Comment out chart loading code
content = content.replace(
    /\/\/ Load charts\s+currentTemplate\.configuration\.charts\.forEach\(chartConfig => {/,
    '// No charts to load - custom charts will be added by the user\n            /*\n            currentTemplate.configuration.charts.forEach(chartConfig => {'
);

// Find the end of the chart loading block and add closing comment
content = content.replace(
    /});\s+\/\/ Load text blocks/,
    '});\n            */\n            // Load text blocks'
);

// Write back to the file
fs.writeFileSync('Frontend/js/report-editor.js', content, 'utf8');

console.log('Patching complete\!');
