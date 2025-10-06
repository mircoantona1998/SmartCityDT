'use strict';

const fs = require('fs');
const { Mqtt: Protocol } = require('azure-iot-device-mqtt');
const { Client, Message } = require('azure-iot-device');

const devices = JSON.parse(fs.readFileSync('trafficlights.json', 'utf8'));

function printResultFor(op, deviceId) {
  return function (err, res) {
    if (err) console.log(`[${deviceId}] ${op} error: ${err.toString()}`);
    if (res) console.log(`[${deviceId}] ${op} status: ${res.constructor.name}`);
  };
}

function startIndependentTrafficLight(deviceConfig) {
  const connectionString = `HostName=${deviceConfig.hostName};DeviceId=${deviceConfig.deviceId};SharedAccessKey=${deviceConfig.sharedAccessKey}`;
  const client = Client.fromConnectionString(connectionString, Protocol);

  client.open((err) => {
    if (err) {
      console.log(`[${deviceConfig.deviceId}] Could not connect: ${err}`);
    } else {
      console.log(`[${deviceConfig.deviceId}] Client connected`);

      setInterval(() => {
        const stato_semaforo = Math.floor(Math.random() * 3) + 1; 

        const data = JSON.stringify({ stato_semaforo});

        const message = new Message(data);
        message.contentType = "application/json";
        message.contentEncoding = "utf-8";

        console.log(`[${deviceConfig.deviceId}] Sending: ${data}`);
        client.sendEvent(message, printResultFor('send', deviceConfig.deviceId));
      }, 30000);
    }
  });
}

devices.forEach(startIndependentTrafficLight);


