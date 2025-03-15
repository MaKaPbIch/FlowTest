var fs = require('fs');
var content = fs.readFileSync('Frontend/js/report-editor.js', 'utf8');

// Let's find all instances of "// Load charts" followed by forEach
var chartLoadIndex1 = content.indexOf('// Load charts', 4690);
var chartLoadIndex2 = content.indexOf('// Load charts', 4340);

// Check if we found both instances
if (chartLoadIndex1 > 0) {
    console.log("Found first chart load at", chartLoadIndex1);
    
    // Find the ending bracket of the forEach after this position
    var startSearch = content.indexOf('currentTemplate.configuration.charts.forEach', chartLoadIndex1);
    var endBracketPos = -1;
    var bracketCount = 0;
    var inForEach = false;
    
    // Since the forEach starts on this line, search from here
    for (var i = startSearch; i < content.length; i++) {
        if (content[i] === '{') {
            bracketCount++;
            inForEach = true;
        } else if (content[i] === '}') {
            bracketCount--;
            if (inForEach && bracketCount === 0) {
                // We found the end of the forEach block
                endBracketPos = i;
                break;
            }
        }
    }
    
    if (endBracketPos > 0) {
        // Extract the whole forEach block
        var forEachBlock = content.substring(startSearch, endBracketPos + 1);
        console.log("Found forEach block, length:", forEachBlock.length);
        
        // Replace the forEach with a comment
        var newContent = content.substring(0, chartLoadIndex1) + 
            '// No charts to load - custom charts will be added by the user' + 
            content.substring(endBracketPos + 1);
        
        fs.writeFileSync('Frontend/js/report-editor.js', newContent, 'utf8');
        console.log('First chart loading removed\!');
    }
}

if (chartLoadIndex2 > 0) {
    // Read the updated file
    content = fs.readFileSync('Frontend/js/report-editor.js', 'utf8');
    console.log("Found second chart load at", chartLoadIndex2);
    
    // For the second instance, do the same
    var startSearch = content.indexOf('currentTemplate.configuration.charts.forEach', chartLoadIndex2);
    var endBracketPos = -1;
    var bracketCount = 0;
    var inForEach = false;
    
    for (var i = startSearch; i < content.length; i++) {
        if (content[i] === '{') {
            bracketCount++;
            inForEach = true;
        } else if (content[i] === '}') {
            bracketCount--;
            if (inForEach && bracketCount === 0) {
                endBracketPos = i;
                break;
            }
        }
    }
    
    if (endBracketPos > 0) {
        var forEachBlock = content.substring(startSearch, endBracketPos + 1);
        console.log("Found second forEach block, length:", forEachBlock.length);
        
        var newContent = content.substring(0, chartLoadIndex2) + 
            '// No charts to load - custom charts will be added by the user' + 
            content.substring(endBracketPos + 1);
        
        fs.writeFileSync('Frontend/js/report-editor.js', newContent, 'utf8');
        console.log('Second chart loading removed\!');
    }
}
