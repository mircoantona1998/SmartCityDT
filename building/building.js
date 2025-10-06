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
  const incEnergy = deviceConfig.incEnergyConsumption ?? (1 + Math.random());              

  let temperatureAvg = deviceConfig.baseTemperature ?? (20 + Math.random() * 3); 
  let humidityAvg    = deviceConfig.baseHumidity    ?? (35 + Math.random() * 10); 

  client.open((err) => {
    if (err) {
      console.log(`[${deviceConfig.deviceId}] Could not connect: ${err}`);
      return;
    }
    console.log(`[${deviceConfig.deviceId}] Building client connected`);

    setInterval(() => {
      energyConsumption += incEnergy * (0.95 + Math.random() * 0.1);
      temperatureAvg    += (Math.random() - 0.5) * 0.1;
      humidityAvg       += (Math.random() - 0.5) * 0.3;

      const EnergyConsumption_Palace = +energyConsumption.toFixed(3);
      const EnergyPurchaseCost_Palace = +(EnergyConsumption_Palace * pricePerKWh).toFixed(4);

      const payload = {
        EnergyConsumption_Palace,                              
        EnergyPurchaseCost_Palace,                            
        TemperatureAvg_Palace: +temperatureAvg.toFixed(2),   
        HumidityAvg_Palace: +humidityAvg.toFixed(2)           
      };

      const message = new Message(JSON.stringify(payload));
      message.contentType = 'application/json';
      message.contentEncoding = 'utf-8';

      client.sendEvent(message, printResultFor('send', deviceConfig.deviceId));
    }, BUILDING_SEND_MS);
  });
}

buildings.forEach(startBuilding);
