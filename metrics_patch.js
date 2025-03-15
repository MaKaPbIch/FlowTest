var fs = require('fs');
var content = fs.readFileSync('Frontend/js/report-editor.js', 'utf8');
var newContent = content.replace(
    /\/\/ Initialize metrics\n        if \(currentTemplate\.configuration\.metrics\) {\n            currentTemplate\.configuration\.metrics\.forEach\(metricId => {\n                addMetricToReport\(metricId\);\n            }\);\n        } else {\n            currentTemplate\.configuration\.metrics = \[\];\n        }/g,
    '// Initialize metrics array but dont add any to the report\n        if (\!currentTemplate.configuration.metrics) {\n            currentTemplate.configuration.metrics = [];\n        }'
);
fs.writeFileSync('Frontend/js/report-editor.js', newContent, 'utf8');
console.log('Metrics patched\!');
