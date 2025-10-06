'use strict';

const fs = require('fs');
const { DefaultAzureCredential } = require('@azure/identity');
const { DigitalTwinsClient } = require('@azure/digital-twins-core');

// URL del tuo Digital Twins (cambia con il tuo endpoint ADT)
const adtUrl = "https://SmartCity.api.weu.digitaltwins.azure.net";

// Credenziali Azure
const credential = new DefaultAzureCredential();
const client = new DigitalTwinsClient(adtUrl, credential);

// Carico i file JSON
const buildings = JSON.parse(fs.readFileSync('buildings.json', 'utf8'));
const patch = JSON.parse(fs.readFileSync('initialization_building.json', 'utf8'));

async function updateBuildingTwins() {
  for (const building of buildings) {
    try {
      // Preparo una patch nuova combinando patch.json con i dati statici del building
      const fullPatch = [
        ...patch
      ];

      console.log(`Aggiorno Twin ${building.deviceId} con:`, fullPatch);

      // Applico la patch al Twin con id uguale a deviceId
      await client.updateDigitalTwin(building.deviceId, fullPatch);
      console.log(`✅ Twin aggiornato: ${building.deviceId}`);
    } catch (err) {
      console.error(`❌ Errore aggiornando ${building.deviceId}:`, err);
    }
  }
}

updateBuildingTwins();
