'use strict';

const fs = require('fs');
const { Mqtt: Protocol } = require('azure-iot-device-mqtt');
const { Client, Message } = require('azure-iot-device');

const DEFAULT_PRICE_PER_KWH = 0.25; 
const APARTMENT_SEND_MS = 30000;

const apartments = JSON.parse(fs.readFileSync('apartments.json', 'utf8'));

function printResultFor(op, deviceId) {
  return function (err, res) {
    if (err) console.log(`[${deviceId}] ${op} error: ${err.toString()}`);
    if (res) console.log(`[${deviceId}] ${op} status: ${res.constructor.name}`);
  };
}

function startApartment(deviceConfig) {
  const client = Client.fromConnectionString(
    `HostName=${deviceConfig.hostName};DeviceId=${deviceConfig.deviceId};SharedAccessKey=${deviceConfig.sharedAccessKey}`,
    Protocol
  );

  const pricePerKWh = typeof deviceConfig.pricePerKWh === 'number'
    ? deviceConfig.pricePerKWh
    : DEFAULT_PRICE_PER_KWH;

  let temperature = deviceConfig.baseTemperature ?? (18 + Math.random() * 5);  
  let humidity    = deviceConfig.baseHumidity    ?? (30 + Math.random() * 40);  

  client.open((err) => {
    if (err) {
      console.log(`[${deviceConfig.deviceId}] Could not connect: ${err}`);
      return;
    }
    console.log(`[${deviceConfig.deviceId}] Apartment client connected`);

    setInterval(() => {
      const energyConsumption = +(Math.random() * 3).toFixed(3);

      temperature += (Math.random() - 0.5) * 0.2;
      humidity    += (Math.random() - 0.5) * 0.5;

      const occupancy = Math.random() < 0.5 ? 'Occupato' : 'Vuoto';
      const energyConsumptionCost = +(energyConsumption * pricePerKWh).toFixed(4);

      const payload = {
        PricePerKWh: pricePerKWh,
        EnergyConsumption: energyConsumption,
        EnergyConsumptionCost: energyConsumptionCost,
        Temperature: +temperature.toFixed(2),
        Humidity: +humidity.toFixed(2),
        Occupancy: occupancy
      };

      const message = new Message(JSON.stringify(payload));
      message.contentType = "application/json";
      message.contentEncoding = "utf-8";

      client.sendEvent(message, printResultFor('send', deviceConfig.deviceId));
    }, APARTMENT_SEND_MS);
  });
}

apartments.forEach(startApartment);
