'use strict';

const fs = require('fs');
const { DefaultAzureCredential } = require('@azure/identity');
const { DigitalTwinsClient } = require('@azure/digital-twins-core');

const adtUrl = "https://SmartCity.api.weu.digitaltwins.azure.net";

const credential = new DefaultAzureCredential();
const client = new DigitalTwinsClient(adtUrl, credential);

// Carico device e patch
const streets = JSON.parse(fs.readFileSync('../streets/streets.json', 'utf8'));
const patch = JSON.parse(fs.readFileSync('initialization_streets.json', 'utf8'));

async function updateStreetTwins() {
  for (const street of streets) {
    try {
      console.log(`Aggiorno Twin ${street.deviceId} con:`, patch);
      await client.updateDigitalTwin(street.deviceId, patch);
      console.log(`✅ Twin aggiornato: ${street.deviceId}`);
    } catch (err) {
      console.error(`❌ Errore aggiornando ${street.deviceId}:`, err);
    }
  }
}

updateStreetTwins();
