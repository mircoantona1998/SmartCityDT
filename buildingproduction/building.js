'use strict';

const fs = require('fs');
const { Mqtt: Protocol } = require('azure-iot-device-mqtt');
const { Client, Message } = require('azure-iot-device');

const DEFAULT_PRICE_PER_KWH = 0.25; 
const BUILDING_SEND_MS = 30000;

const buildings = JSON.parse(fs.readFileSync('buildings.json', 'utf8'));

function printResultFor(op, deviceId) {
  return function (err, res) {
    if (err) console.log(`[${deviceId}] ${op} error: ${err.toString()}`);
    if (res) console.log(`[${deviceId}] ${op} status: ${res.constructor.name}`);
  };
}

function startBuilding(deviceConfig) {
  const client = Client.fromConnectionString(
    `HostName=${deviceConfig.hostName};DeviceId=${deviceConfig.deviceId};SharedAccessKey=${deviceConfig.sharedAccessKey}`,
    Protocol
  );


  const pricePerKWh = (typeof deviceConfig.pricePerKWh === 'number')
    ? deviceConfig.pricePerKWh
    : DEFAULT_PRICE_PER_KWH;

  let energyConsumption = deviceConfig.baseEnergyConsumption ?? (100 + Math.random() * 50); 
  let energyProduction  = deviceConfig.baseEnergyProduction  ?? (50  + Math.random() * 30); 
  const incEnergyCons   = deviceConfig.incEnergyConsumption  ?? (1   + Math.random());       
  const incEnergyProd   = deviceConfig.incEnergyProduction   ?? (0.6 + Math.random());       

  let temperatureAvg = deviceConfig.baseTemperature ?? (20 + Math.random() * 3); 
  let humidityAvg    = deviceConfig.baseHumidity    ?? (35 + Math.random() * 10); 

  const MAX_PV_KW = (typeof deviceConfig.maxPvKw === 'number') ? deviceConfig.maxPvKw : 20; 
  const PANEL_COUNT = Number.isInteger(deviceConfig.SolarPanelCount_Palace)
    ? deviceConfig.SolarPanelCount_Palace
    : 60;

  client.open((err) => {
    if (err) {
      console.log(`[${deviceConfig.deviceId}] Could not connect: ${err}`);
      return;
    }
    console.log(`[${deviceConfig.deviceId}] Building (Produzione) client connected`);

    setInterval(() => {
      energyConsumption += incEnergyCons * (0.95 + Math.random() * 0.1);
      energyProduction  += incEnergyProd * (0.95 + Math.random() * 0.1);
      temperatureAvg    += (Math.random() - 0.5) * 0.1;
      humidityAvg       += (Math.random() - 0.5) * 0.3;

      const EnergyConsumption_Palace = +energyConsumption.toFixed(3);
      const EnergyProduction_Palace  = +energyProduction.toFixed(3);
      const SelfConsumption_Palace   = +Math.min(energyProduction, energyConsumption).toFixed(3);
      const energyPurchased          = Math.max(EnergyConsumption_Palace - SelfConsumption_Palace, 0);
      const CostConsumptionEffective_Palace = +(energyPurchased * pricePerKWh).toFixed(4);
      const EnergyPurchaseCost_Palace = CostConsumptionEffective_Palace;

      const payload = {
        EnergyConsumption_Palace: EnergyConsumption_Palace,
        EnergyPurchaseCost_Palace: EnergyPurchaseCost_Palace, 
        HumidityAvg_Palace: humidityAvg,
        TemperatureAvg_Palace:temperatureAvg,
        EnergyProduction_Palace: EnergyProduction_Palace,
        SelfConsumption_Palace: SelfConsumption_Palace,
        CostConsumptionEffective_Palace: CostConsumptionEffective_Palace,
      };

      const message = new Message(JSON.stringify(payload));
      message.contentType = 'application/json';
      message.contentEncoding = 'utf-8';

      console.log(`[${deviceConfig.deviceId}] Sending:`, payload);
      client.sendEvent(message, printResultFor('send', deviceConfig.deviceId));
    }, BUILDING_SEND_MS);
  });
}

buildings.forEach(startBuilding);
