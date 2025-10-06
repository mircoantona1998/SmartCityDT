'use strict';

const fs = require('fs');
const { DefaultAzureCredential } = require('@azure/identity');
const { DigitalTwinsClient } = require('@azure/digital-twins-core');

// URL del tuo Digital Twins
const adtUrl = "https://SmartCity.api.weu.digitaltwins.azure.net";

const credential = new DefaultAzureCredential();
const client = new DigitalTwinsClient(adtUrl, credential);

// Carico device e patch
const streetlamps = JSON.parse(fs.readFileSync('../lamps/lamps.json', 'utf8'));
const patch = JSON.parse(fs.readFileSync('initialization_lamps.json', 'utf8'));

async function updateStreetLampTwins() {
  for (const lamp of streetlamps) {
    try {
      // Preparo la patch completa
      const fullPatch = [...patch
      ];

      console.log(`Aggiorno Twin ${lamp.deviceId} con:`, fullPatch);

      await client.updateDigitalTwin(lamp.deviceId, fullPatch);
      console.log(`✅ Twin aggiornato: ${lamp.deviceId}`);
    } catch (err) {
      console.error(`❌ Errore aggiornando ${lamp.deviceId}:`, err);
    }
  }
}

updateStreetLampTwins();
