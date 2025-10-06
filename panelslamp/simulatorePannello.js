'use strict';

const fs = require('fs');
const { Mqtt: Protocol } = require('azure-iot-device-mqtt');
const { Client, Message } = require('azure-iot-device');

const devices = JSON.parse(fs.readFileSync('panels.json', 'utf8'));

function printResultFor(op, deviceId) {
  return function (err, res) {
    if (err) console.log(`[${deviceId}] ${op} error: ${err.toString()}`);
    if (res) console.log(`[${deviceId}] ${op} status: ${res.constructor.name}`);
  };
}

function startIndependentPanel(deviceConfig) {
  const connectionString = `HostName=${deviceConfig.hostName};DeviceId=${deviceConfig.deviceId};SharedAccessKey=${deviceConfig.sharedAccessKey}`;
  const client = Client.fromConnectionString(connectionString, Protocol);

  const INTERVAL_MS = 30000;
  let energyProduced_kWh = Number(deviceConfig.EnergyProduced_kWh) || 0;
  let batterySoC = (typeof deviceConfig.Battery_SoC_Percent === 'number') ? deviceConfig.Battery_SoC_Percent : 50;

  const CO2_SavingFactor_panelLamp =
    (typeof deviceConfig.CO2_SavingFactor_panelLamp === 'number') ? deviceConfig.CO2_SavingFactor_panelLamp : 0.27;

  const MAX_DELTA_KWH_PER_TICK =
    (typeof deviceConfig.maxDeltaKWhPerTick === 'number') ? deviceConfig.maxDeltaKWhPerTick : 0.01;

  client.open((err) => {
    if (err) {
      console.log(`[${deviceConfig.deviceId}] Could not connect: ${err}`);
    } else {
      console.log(`[${deviceConfig.deviceId}] Client connected`);

      setInterval(() => {
        const deltaKWh = Number((Math.random() * MAX_DELTA_KWH_PER_TICK).toFixed(6));
        energyProduced_kWh = Number((energyProduced_kWh + deltaKWh).toFixed(6));

        batterySoC += (Math.random() * 0.6 - 0.2); 
        if (batterySoC > 100) batterySoC = 100;
        if (batterySoC < 0) batterySoC = 20;
        const Battery_SoC_Percent = Number(batterySoC.toFixed(2));

        let Panel_Status = 'Standby';
        if (Battery_SoC_Percent <= 5) Panel_Status = 'Off';
        else if (deltaKWh > MAX_DELTA_KWH_PER_TICK * 0.2) Panel_Status = 'On';

        const CO2_Avoided_kg_panelLamp = Number((energyProduced_kWh * CO2_SavingFactor_panelLamp).toFixed(6));

        const data = {
          Battery_SoC_Percent,
          EnergyProduced_kWh: energyProduced_kWh,
          Panel_Status,
          CO2_Avoided_kg_panelLamp,
        };

        const message = new Message(JSON.stringify(data));
        message.contentType = "application/json";
        message.contentEncoding = "utf-8";

        console.log(`[${deviceConfig.deviceId}] Sending:`, data);
        client.sendEvent(message, printResultFor('send', deviceConfig.deviceId));
      }, INTERVAL_MS);
    }
  });
}

devices.forEach(startIndependentPanel);
