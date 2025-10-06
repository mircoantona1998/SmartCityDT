'use strict';

const fs = require('fs');
const { Mqtt: Protocol } = require('azure-iot-device-mqtt');
const { Client, Message } = require('azure-iot-device');

const devices = JSON.parse(fs.readFileSync('streets.json', 'utf8'));

function startDevice(deviceConfig) {
  const connectionString = `HostName=${deviceConfig.hostName};DeviceId=${deviceConfig.deviceId};SharedAccessKey=${deviceConfig.sharedAccessKey}`;
  const client = Client.fromConnectionString(connectionString, Protocol);

  function printResultFor(op) {
    return function (err, res) {
      if (err) console.log(`[${deviceConfig.deviceId}] ${op} error: ${err.toString()}`);
      if (res) console.log(`[${deviceConfig.deviceId}] ${op} status: ${res.constructor.name}`);
    };
  }

  const connectCallback = (err) => {
    if (err) {
      console.log(`[${deviceConfig.deviceId}] Could not connect: ${err}`);
    } else {
      console.log(`[${deviceConfig.deviceId}] Client connected`);

      setInterval(() => {
        const truckCount_lane1 = Math.floor(Math.random() * 10);
        const carCount_lane1 = Math.floor(Math.random() * 30);
        const busCount_lane1 = Math.floor(Math.random() * 5);
        const vehiclesIn_lane1 = Math.floor(Math.random() * 50);
        const vehiclesOut_lane1 = Math.floor(Math.random() * 50);

        const truckCount_lane2 = Math.floor(Math.random() * 10);
        const carCount_lane2  = Math.floor(Math.random() * 30);
        const busCount_lane2  = Math.floor(Math.random() * 5);
        const vehiclesIn_lane2  = Math.floor(Math.random() * 50);
        const vehiclesOut_lane2  = Math.floor(Math.random() * 50);
        const data = {
          truckCount_lane1,
          carCount_lane1,
          busCount_lane1,
          vehiclesIn_lane1,
          vehiclesOut_lane1,
          truckCount_lane2,
          carCount_lane2,
          busCount_lane2,
          vehiclesIn_lane2,
          vehiclesOut_lane2,
        };

        const message = new Message(JSON.stringify(data));
        message.contentType = "application/json";
        message.contentEncoding = "utf-8";

        console.log(`[${deviceConfig.deviceId}] Sending message:`, data);
        client.sendEvent(message, printResultFor('send'));
      }, 30000);
    }
  };

  client.open(connectCallback);
}

devices.forEach(startDevice);
