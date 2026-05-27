const fs = require('fs');
let c = fs.readFileSync('app/page.js', 'utf8');
c = c.replace(/{sensorTemp !== null \? sensorTemp.toFixed\(1\) : "36.5"}/g, '{sensorTemp !== null ? sensorTemp.toFixed(1) : "--"}');
c = c.replace(/{weatherTemp !== null \? weatherTemp.toFixed\(1\) : "34.0"}/g, '{weatherTemp !== null ? weatherTemp.toFixed(1) : "--"}');
c = c.replace(/{nearestShelter \? nearestShelter.name : "Central Library"}/g, '{nearestShelter ? nearestShelter.name : "Detect location"}');
c = c.replace(/{nearestShelter \? nearestShelter.distance.toFixed\(1\) : "0.8"}/g, '{nearestShelter ? nearestShelter.distance.toFixed(1) : "--"}');
fs.writeFileSync('app/page.js', c);
