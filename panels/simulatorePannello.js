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

  client.open((err) => {
    if (err) {
      console.log(`[${deviceConfig.deviceId}] Could not connect: ${err}`);
    } else {
      console.log(`[${deviceConfig.deviceId}] Client connected`);

      setInterval(() => {
       const Inverter_EnergyProduced_kWh= parseFloat((Math.random() * 1000).toFixed(2))

      const data = {
        CO2_Avoided_kg:Inverter_EnergyProduced_kWh*0.27,
        Roof_Azimuth: parseFloat((Math.random() * 360).toFixed(2)),
        Performance_Ratio: parseFloat((Math.random() * 100).toFixed(2)),
        Roof_LoadCapacity: parseFloat((Math.random() * 500).toFixed(2)),
        Inverter_InstantPower_kW: parseFloat((Math.random() * 500).toFixed(2)),
        NominalPower_Wp: parseFloat((Math.random() * 500).toFixed(2)),
        Inverter_Power_kW: parseFloat((Math.random() * 500).toFixed(2)),
        Panel_InstantPower_W: parseFloat((Math.random() * 500).toFixed(2)),
        Inverter_Efficiency: parseFloat((Math.random() * 100).toFixed(2)),
        STC_Efficiency: parseFloat((Math.random() * 100).toFixed(2)),
        Inverter_EnergyProduced_kWh: Inverter_EnergyProduced_kWh,
        Inverter_Status: "OK",
        Inverter_Temperature_C: parseFloat((Math.random() * 60).toFixed(2)),
        Panel_Temperature_C: parseFloat((Math.random() * 60).toFixed(2)),
        String_DC_Voltage: parseFloat((Math.random() * 600).toFixed(2)),
        String_DC_Current: parseFloat((Math.random() * 10).toFixed(2)),
        Plant_Availability: parseFloat((Math.random() * 100).toFixed(2)),
        Specific_Yield_kWh_kWp: parseFloat((Math.random() * 5).toFixed(2)),
      };

      const message = new Message(JSON.stringify(data));
      message.contentType = "application/json";
      message.contentEncoding = "utf-8";

      console.log(`[${deviceConfig.deviceId}] Sending:`, data);
      client.sendEvent(message, printResultFor('send', deviceConfig.deviceId));
    }, 30000);
    }
  });
}

devices.forEach(startIndependentPanel);
