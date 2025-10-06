'use strict';

const fs = require('fs');
const { Mqtt: Protocol } = require('azure-iot-device-mqtt');
const { Client, Message } = require('azure-iot-device');

const TICK_MS = 30_000;
const INTERVAL_HOURS = TICK_MS / 3600000;
const DEFAULT_PRICE_PER_KWH = 0.25;

const panels = JSON.parse(fs.readFileSync('panels.json', 'utf8'));
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

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function openClientFromConnStr(cfg) {
  const connStr = `HostName=${cfg.hostName};DeviceId=${cfg.deviceId};SharedAccessKey=${cfg.sharedAccessKey}`;
  return Client.fromConnectionString(connStr, Protocol);
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

const panelClients = panels.map(cfg => ({ cfg, client: openClientFromConnStr(cfg) }));
const apartmentClients = apartments.map(cfg => ({ cfg, client: openClientFromConnStr(cfg) }));
const buildingClient = openClientFromConnStr(buildingCfg);

const pricePerKWh = (typeof buildingCfg.pricePerKWh === 'number') ? buildingCfg.pricePerKWh : DEFAULT_PRICE_PER_KWH;

// Stato finestra
function newAggState() {
  return { prodKWh: 0, consKWh: 0, tempSum: 0, humidSum: 0, aptCount: 0 };
}
let agg = newAggState();

// Stato cumulativo persistente
let cum = { prodKWh: 0, consKWh: 0, purchaseCost: 0 };

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
      ...panelClients.map(p => openAsync(p.client, p.cfg.deviceId)),
      ...apartmentClients.map(a => openAsync(a.client, a.cfg.deviceId)),
      openAsync(buildingClient, buildingCfg.deviceId),
    ]);

    console.log('Tutti i client connessi. Avvio ciclo ogni 30s...');
    runCycle();
  } catch (e) {
    console.error('Errore in fase di connessione iniziale:', e);
    process.exit(1);
  }
})();

async function runCycle() {
  const cycleStart = Date.now();
  agg = newAggState();

  // 1) PANNELLI
  for (const { cfg, client } of panelClients) {
    // Produzione random tra 0 e 6 kWh nella finestra
    const produced_kWh = +randomBetween(0, 6).toFixed(3);

    const data = {
      Inverter_EnergyProduced_kWh: produced_kWh,
      CO2_Avoided_kg: roundN(produced_kWh * 0.27, 3),
      Inverter_Status: "OK",
      Panel_Temperature_C: parseFloat((Math.random() * 60).toFixed(2)),
      kind: 'panel'
    };

    agg.prodKWh += produced_kWh;
    console.log(`[${cfg.deviceId}] PANEL produced=${produced_kWh.toFixed(3)}kWh -> prodKWh_window=${agg.prodKWh.toFixed(3)}`);

    const msg = new Message(JSON.stringify(data));
    msg.contentType = 'application/json';
    msg.contentEncoding = 'utf-8';
    await sendAsync(client, msg, cfg.deviceId);
  }

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

    console.log(`[${cfg.deviceId}] APT cons=${energyConsumption.toFixed(3)}kWh cost=${energyConsumptionCost.toFixed(4)} -> consKWh_window=${agg.consKWh.toFixed(3)}`);

    const msg = new Message(JSON.stringify(payload));
    msg.contentType = 'application/json';
    msg.contentEncoding = 'utf-8';
    await sendAsync(client, msg, cfg.deviceId);
  }

  // 3) PALAZZO (aggregato + cumulativi)
  const totalProduction_window   = roundN(agg.prodKWh, 3);
  const totalConsumption_window  = roundN(agg.consKWh, 3);


  const selfConsumption_window   = roundN(Math.min(totalProduction_window, totalConsumption_window), 3);
  const purchasedEnergy_window   = roundN(Math.max(totalConsumption_window - selfConsumption_window, 0), 3);
  const purchaseCost_window      = roundN(purchasedEnergy_window * pricePerKWh, 4);
  const moneySaving_window       = roundN(selfConsumption_window * pricePerKWh, 4);
  const salesRevenue_window      = roundN(Math.max(totalProduction_window - selfConsumption_window, 0) * pricePerKWh, 4);
  const aggSelfConsumption  = roundN(Math.min(agg.prodKWh, agg.consKWh), 3);

  const aggPurchasedEnergy = roundN(agg.consKWh, 3) - roundN(agg.prodKWh, 3);

  let aggPurchaseCost= "";
  aggPurchaseCost= roundN(Math.max(aggPurchasedEnergy, 0) * pricePerKWh, 4);
  agg.purchaseCost = roundN(Math.max(aggPurchasedEnergy, 0) * pricePerKWh, 4);
  if (aggPurchaseCost==0)
      aggPurchaseCost="0";
  const surplusEnergy = roundN(agg.prodKWh, 3) - roundN(aggSelfConsumption, 3);
  let aggSalesRevenue = "";
  aggSalesRevenue = roundN(Math.max(surplusEnergy, 0) * pricePerKWh, 4);
  if (aggSalesRevenue==0) 
      aggSalesRevenue="0";
  const avgTemp  = (agg.aptCount > 0) ? roundN(agg.tempSum / agg.aptCount, 2) : null;
  const avgHumid = (agg.aptCount > 0) ? roundN(agg.humidSum / agg.aptCount, 2) : null;
  const aggMoneySaving      = roundN(aggSelfConsumption * pricePerKWh, 4);

  const buildingPayload = {
    EnergyConsumption_Palace:  roundN(agg.consKWh, 3),
    EnergyProduction_Palace:   roundN(agg.prodKWh, 3),
    SelfConsumption_Palace:    aggSelfConsumption.toString(),
    EnergyPurchaseCost_Palace: aggPurchaseCost.toString(),
    MoneySavingSumOfApts_Palace: aggMoneySaving.toString(),
    EnergySalesRevenue:        aggSalesRevenue.toString(),
    WindowSeconds: TICK_MS / 1000,
    Window_EnergyProduction_kWh:   totalProduction_window,
    Window_EnergyConsumption_kWh:  totalConsumption_window,
    Window_SelfConsumption_kWh:    selfConsumption_window,
    Window_EnergyPurchased_kWh:    purchasedEnergy_window,
    Window_EnergyPurchaseCost:     purchaseCost_window,
    Window_MoneySavingSumOfApts:   moneySaving_window,
    Window_EnergySalesRevenue:     salesRevenue_window,
    TemperatureAvg_Palace:     avgTemp,
    HumidityAvg_Palace:        avgHumid
  };

  console.log(
    `[${buildingCfg.deviceId}] AGG ` +
    `WINDOW prod=${totalProduction_window} cons=${totalConsumption_window} ` +
    `| AGG prod=${agg.prodKWh.toFixed(3)} cons=${agg.consKWh.toFixed(3)} self=${aggSelfConsumption} ` +
    `purchased=${aggPurchasedEnergy} cost=${agg.purchaseCost} ` +
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
