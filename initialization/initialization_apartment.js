'use strict';

const fs = require('fs');
const { DefaultAzureCredential } = require('@azure/identity');
const { DigitalTwinsClient } = require('@azure/digital-twins-core');

// URL del tuo Digital Twins (sostituisci con il tuo)
const adtUrl = "https://SmartCity.api.weu.digitaltwins.azure.net";

// Credenziali Azure
const credential = new DefaultAzureCredential();
const client = new DigitalTwinsClient(adtUrl, credential);

// Carico i file JSON
const apartments = JSON.parse(fs.readFileSync('apartments.json', 'utf8'));
const patch = JSON.parse(fs.readFileSync('initialization_apartment.json', 'utf8'));

async function updateTwins() {
  for (const device of apartments) {
    try {
      // Preparo una patch nuova combinando patch.json con le info del device
      const fullPatch = [
        ...patch,
        { op: "add", path: "/Apartment_ID", value: device.Apartment_ID },
        { op: "add", path: "/Building_ID", value: device.Building_ID },
        { op: "add", path: "/Floor", value: device.Floor },
        { op: "add", path: "/NumberOfRooms", value: device.NumberOfRooms }
      ];

      console.log(`Aggiorno Twin ${device.deviceId} con:`, fullPatch);

      // Applico la patch al Twin con deviceId = twinId
      await client.updateDigitalTwin(device.deviceId, fullPatch);
      console.log(`✅ Twin aggiornato: ${device.deviceId}`);
    } catch (err) {
      console.error(`❌ Errore aggiornando ${device.deviceId}:`, err);
    }
  }
}

updateTwins();
