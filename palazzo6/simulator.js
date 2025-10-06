'use strict';

const fs = require('fs');
const { Mqtt: Protocol } = require('azure-iot-device-mqtt');
const { Client, Message } = require('azure-iot-device');

const TICK_MS = 30_000;
const INTERVAL_HOURS = TICK_MS / 3600000;
const DEFAULT_PRICE_PER_KWH = 0.25;

const apartments = JSON.parse(fs.readFileSync('apartments.json', 'utf8'));
const buildings = JSON.parse(fs.readFileSync('buildings.json', 'utf8'));

if (!Array.isArray(buildings) || buildings.length === 0) {
  console.error('buildings.json deve contenere almeno un building.');
  process.exit(1);
}
if (buildings.length > 1) {
  console.warn('Trovati più building: verrà usato SOLO il primo.');
}
const buildingCfg = buildings[0];

function printResultFor(op, deviceId) {
  return function (err, res) {
    if (err) console.log(`[${deviceId}] ${op} error: ${err.toString()}`);
    if (res) console.log(`[${deviceId}] ${op} status: ${res.constructor.name}`);
  };
}

function roundN(x, n = 3) {
  const f = 10 ** n;
  return Math.round(x * f) / f;
}

function openClientFromConnStr(cfg) {
  const connStr = `HostName=${cfg.hostName};DeviceId=${cfg.deviceId};SharedAccessKey=${cfg.sharedAccessKey}`;
  const client = Client.fromConnectionString(connStr, Protocol);
  return client;
}

function openAsync(client, deviceId) {
  return new Promise((resolve, reject) => {
    client.open((err) => {
      if (err) {
        console.error(`[${deviceId}] Could not connect: ${err}`);
        reject(err);
      } else {
        console.log(`[${deviceId}] Client connected`);
        resolve();
      }
    });
  });
}

function sendAsync(client, message, deviceId) {
  return new Promise((resolve) => {
    client.sendEvent(message, (err, res) => {
      printResultFor('send', deviceId)(err, res);
      resolve();
    });
  });
}

const apartmentClients = apartments.map(cfg => ({ cfg, client: openClientFromConnStr(cfg) }));
const buildingClient = openClientFromConnStr(buildingCfg);

const pricePerKWh = (typeof buildingCfg.pricePerKWh === 'number') ? buildingCfg.pricePerKWh : DEFAULT_PRICE_PER_KWH;

function newAggState() {
  return {  consKWh: 0, tempSum: 0, humidSum: 0, aptCount: 0 };
}
let agg = newAggState();



const aptState = new Map(); 
function getAptState(cfg) {
  if (!aptState.has(cfg.deviceId)) {
    aptState.set(cfg.deviceId, {
      temperature: cfg.baseTemperature ?? (18 + Math.random() * 5),
      humidity: cfg.baseHumidity ?? (30 + Math.random() * 40),
    });
  }
  return aptState.get(cfg.deviceId);
}

(async function boot() {
  try {
    await Promise.all([
      ...apartmentClients.map(a => openAsync(a.client, a.cfg.deviceId)),
      openAsync(buildingClient, buildingCfg.deviceId),
    ]);

    console.log('Tutti i client connessi. Avvio ciclo ogni 30s...');
    runCycle(); // first cycle now
  } catch (e) {
    console.error('Errore in fase di connessione iniziale:', e);
    process.exit(1);
  }
})();

async function runCycle() {
  const cycleStart = Date.now();
  agg = newAggState(); 

 

  // 2) APPARTAMENTI
  for (const { cfg, client } of apartmentClients) {
    const s = getAptState(cfg);
    s.temperature += (Math.random() - 0.5) * 0.2;
    s.humidity    += (Math.random() - 0.5) * 0.5;

    const energyConsumption = +(Math.random() * 3).toFixed(3); 
    const priceForApt = (typeof cfg.pricePerKWh === 'number') ? Number(cfg.pricePerKWh) : pricePerKWh;
    const occupancy = Math.random() < 0.5 ? 'Occupato' : 'Vuoto';

    const energyConsumptionCost = +(energyConsumption * priceForApt).toFixed(4);

    const payload = {
      PricePerKWh: priceForApt,
      EnergyConsumption: energyConsumption,
      EnergyConsumptionCost: energyConsumptionCost,
      Temperature: +s.temperature.toFixed(2),
      Humidity: +s.humidity.toFixed(2),
      Occupancy: occupancy,
      kind: 'apartment'
    };

    agg.consKWh += energyConsumption;
    agg.tempSum += payload.Temperature;
    agg.humidSum += payload.Humidity;
    agg.aptCount += 1;

    console.log(
      `[${cfg.deviceId}] APT cons=${energyConsumption.toFixed(3)}kWh price=${priceForApt} ` +
      `cost=${energyConsumptionCost.toFixed(4)} -> consKWh_window=${agg.consKWh.toFixed(3)}`
    );

    const msg = new Message(JSON.stringify(payload));
    msg.contentType = 'application/json';
    msg.contentEncoding = 'utf-8';
    await sendAsync(client, msg, cfg.deviceId);
  }


  // 3) PALAZZO (AGGREGATO) — calcolo su finestra + cumulativi compatibili
  const totalConsumption_window  = roundN(agg.consKWh, 3);

  const cumConsumptionKWh = roundN(0 + totalConsumption_window, 3);

  const cumPurchaseCost     = roundN(cumConsumptionKWh * pricePerKWh, 4);

  const avgTemp  = (agg.aptCount > 0) ? roundN(agg.tempSum / agg.aptCount, 2) : null;
  const avgHumid = (agg.aptCount > 0) ? roundN(agg.humidSum / agg.aptCount, 2) : null;


  const buildingPayload = {
    EnergyConsumption_Palace:  cumConsumptionKWh,
    EnergyPurchaseCost_Palace: cumPurchaseCost,
    TemperatureAvg_Palace:     avgTemp,
    HumidityAvg_Palace:        avgHumid,

    WindowSeconds: TICK_MS / 1000,
    Window_EnergyConsumption_kWh:  totalConsumption_window,
  };

  console.log(
    `[${buildingCfg.deviceId}] AGG ` +
    `WINDOW  cons=${totalConsumption_window} ` +
    `| CUM  cons=${cumConsumptionKWh}  ` +
    ` cost=${cumPurchaseCost} ` +
    `avgT=${avgTemp} avgH=${avgHumid}`
  );

  const bMsg = new Message(JSON.stringify(buildingPayload));
  bMsg.contentType = 'application/json';
  bMsg.contentEncoding = 'utf-8';
  await sendAsync(buildingClient, bMsg, buildingCfg.deviceId);

  const elapsed = Date.now() - cycleStart;
  const delay = Math.max(0, TICK_MS - elapsed);
  setTimeout(runCycle, delay);

}
