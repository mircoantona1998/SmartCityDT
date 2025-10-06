'use strict';

const fs = require('fs');
const path = require('path');
const { DefaultAzureCredential } = require('@azure/identity');
const { DigitalTwinsClient } = require('@azure/digital-twins-core');

// Imposta l'URL del tuo ADT (oppure usa la variabile d'ambiente ADT_URL)
const adtUrl = process.env.ADT_URL || 'https://SmartCity.api.weu.digitaltwins.azure.net';
const credential = new DefaultAzureCredential();
const client = new DigitalTwinsClient(adtUrl, credential);

// Carica l'elenco device (il JSON che hai incollato)
const devicesPath = path.join(__dirname, '../cameras/cameras.json'); // rinomina come preferisci
const devices = JSON.parse(fs.readFileSync(devicesPath, 'utf8'));

// Valori di default per il modello Telecamera
const DEFAULT_STATUS = 'Offline'; // ammessi: Offline, Idle, Recording
const DEFAULT_LOCATION = '';      // se non la conosci
const DEFAULT_UPTIME = 0.0;

async function upsertTelecameraTwin(device) {
  const twinId = device.deviceId;

  // Twin iniziale conforme al modello dtmi:example:Telecamera;1
  const initialTwin = {
    $metadata: { $model: 'dtmi:example:Telecamera;1' },
    telecamera_ID: twinId,                         // uso deviceId come ID
    location: device.location || DEFAULT_LOCATION, // se vuoi puoi aggiungere "location" nel JSON dei device
    status: DEFAULT_STATUS,
    uptime: DEFAULT_UPTIME
  };

  // upsert: crea se non esiste, aggiorna se esiste (ma il $model DEVE coincidere)
  await client.upsertDigitalTwin(twinId, JSON.stringify(initialTwin));

  // Se vuoi aggiornare qualcosa in patch (es. location da una fonte esterna) fallo qui:
  // const patch = [
  //   { op: 'add', path: '/location', value: 'Piazza Duomo 1' },
  //   { op: 'add', path: '/status', value: 'Idle' },
  //   { op: 'add', path: '/uptime', value: 12.5 }
  // ];
  // await client.updateDigitalTwin(twinId, patch);

  console.log(`✅ Twin upserted: ${twinId}`);
}

async function main() {
  for (const d of devices) {
    try {
      // Per sicurezza: NON memorizziamo hostName / sharedAccessKey nel twin (sono segreti di IoT Hub)
      await upsertTelecameraTwin(d);
    } catch (err) {
      // Se il twin esiste con un MODEL diverso, upsert fallisce: segnalo chiaramente
      console.error(`❌ Errore su ${d.deviceId}:`, err?.message || err);
    }
  }
}

main().catch((e) => {
  console.error('Errore generale:', e);
  process.exit(1);
});
