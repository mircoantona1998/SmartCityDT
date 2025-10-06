'use strict';

const fs = require('fs');
const { DefaultAzureCredential } = require('@azure/identity');
const { DigitalTwinsClient } = require('@azure/digital-twins-core');

// URL del tuo Digital Twins
const adtUrl = "https://SmartCity.api.weu.digitaltwins.azure.net";

const credential = new DefaultAzureCredential();
const client = new DigitalTwinsClient(adtUrl, credential);

// Carico device e patch aggiornato
const panels = JSON.parse(fs.readFileSync('../panels/panels.json', 'utf8'));
const patch = JSON.parse(fs.readFileSync('initialization_panels.json', 'utf8'));

async function updatePanelTwins() {
  for (const panel of panels) {
    try {
      // Combino patch con dati statici del device
      const fullPatch = [
        ...patch, 
      ];

      console.log(`Aggiorno Twin ${panel.deviceId} con patch:`, fullPatch);

      await client.updateDigitalTwin(panel.deviceId, fullPatch);
      console.log(`✅ Twin aggiornato: ${panel.deviceId}`);
    } catch (err) {
      console.error(`❌ Errore aggiornando ${panel.deviceId}:`, err);
    }
  }
}

updatePanelTwins();
