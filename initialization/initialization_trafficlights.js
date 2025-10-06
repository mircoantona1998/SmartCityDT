'use strict';

const fs = require('fs');
const { DefaultAzureCredential } = require('@azure/identity');
const { DigitalTwinsClient } = require('@azure/digital-twins-core');

// URL del tuo Digital Twins
const adtUrl = "https://SmartCity.api.weu.digitaltwins.azure.net";

const credential = new DefaultAzureCredential();
const client = new DigitalTwinsClient(adtUrl, credential);

// Carico device e patch
const trafficLights = JSON.parse(fs.readFileSync('../trafficlights/trafficlights.json', 'utf8'));
const patch = JSON.parse(fs.readFileSync('initialization_trafficlights.json', 'utf8'));
async function updateTrafficLightTwins() {
  for (const light of trafficLights) {
    try {
      console.log(`Aggiorno Twin ${light.deviceId} con:`, patch);
      await client.updateDigitalTwin(light.deviceId, patch);
      console.log(`✅ Twin aggiornato: ${light.deviceId}`);
    } catch (err) {
      console.error(`❌ Errore aggiornando ${light.deviceId}:`, err);
    }
  }
}

updateTrafficLightTwins();