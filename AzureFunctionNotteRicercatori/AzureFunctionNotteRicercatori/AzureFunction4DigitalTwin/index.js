const { DefaultAzureCredential } = require("@azure/identity");
const { DigitalTwinsClient } = require("@azure/digital-twins-core");
const { inspect } = require("util");

module.exports = async function (context, eventGridEvent) {
    const url = "https://SmartCity.api.weu.digitaltwins.azure.net";
    const credential = new DefaultAzureCredential();
    const serviceClient = new DigitalTwinsClient(url, credential);

    try {
        const deviceMessage = JSON.parse(JSON.stringify(eventGridEvent.data));
        context.log(`Ricevuto messaggio dispositivo: ${JSON.stringify(deviceMessage)}`);

        const deviceId = deviceMessage?.systemProperties?.["iothub-connection-device-id"];
        if (!deviceId) {
            throw new Error("ID dispositivo mancante nel messaggio.");
        }

        const body = deviceMessage.body;
        context.log(`Il body del messaggio: ${JSON.stringify(body)}`);
        if (!body) {
            throw new Error("Body del messaggio mancante.");
        }

        const twinPatch = [
            { "op": "replace", "path": "/stato_semaforo", "value": parseFloat(body.stato_semaforo) || null },
            { "op": "replace", "path": "/stato_lampione", "value": parseFloat(body.stato_lampione) || null },
            { "op": "replace", "path": "/OperatingHours", "value": parseFloat(body.OperatingHours) || null },
            { "op": "replace", "path": "/uptime", "value": parseFloat(body.uptime) || null },

            { "op": "replace", "path": "/truckCount_lane1", "value": parseFloat(body.truckCount_lane1) || null },
            { "op": "replace", "path": "/carCount_lane1", "value": parseFloat(body.carCount_lane1) || null },
            { "op": "replace", "path": "/busCount_lane1", "value": parseFloat(body.busCount_lane1) || null },
            { "op": "replace", "path": "/vehiclesIn_lane1", "value": parseFloat(body.vehiclesIn_lane1) || null },
            { "op": "replace", "path": "/vehiclesOut_lane1", "value": parseFloat(body.vehiclesOut_lane1) || null },
            { "op": "replace", "path": "/truckCount_lane2", "value": parseFloat(body.truckCount_lane2) || null },
            { "op": "replace", "path": "/carCount_lane2", "value": parseFloat(body.carCount_lane2) || null },
            { "op": "replace", "path": "/busCount_lane2", "value": parseFloat(body.busCount_lane2) || null },
            { "op": "replace", "path": "/vehiclesIn_lane2", "value": parseFloat(body.vehiclesIn_lane2) || null },
            { "op": "replace", "path": "/vehiclesOut_lane2", "value": parseFloat(body.vehiclesOut_lane2) || null },

            { "op": "replace", "path": "/Mounting_Type", "value": parseFloat(body.Mounting_Type) || null },
            { "op": "replace", "path": "/String_DC_Voltage", "value": parseFloat(body.String_DC_Voltage) || null },
            { "op": "replace", "path": "/Panel_Temperature_C", "value": parseFloat(body.Panel_Temperature_C) || null },
            { "op": "replace", "path": "/Inverter_Temperature_C", "value": parseFloat(body.Inverter_Temperature_C) || null },
            { "op": "replace", "path": "/Roof_AvailableArea", "value": parseFloat(body.Roof_AvailableArea) || null },
            { "op": "replace", "path": "/Inverter_Status", "value": parseFloat(body.Inverter_Status) || null },
            { "op": "replace", "path": "/Specific_Yield_kWh_kWp", "value": parseFloat(body.Specific_Yield_kWh_kWp) || null },
            { "op": "replace", "path": "/Serial_Number", "value": parseFloat(body.Serial_Number) || null },
            { "op": "replace", "path": "/Panel_Manufacturer", "value": parseFloat(body.Panel_Manufacturer) || null },
            { "op": "replace", "path": "/Panel_InstantPower_W", "value": parseFloat(body.Panel_InstantPower_W) || null },
            { "op": "replace", "path": "/Inverter_Power_kW", "value": parseFloat(body.Inverter_Power_kW) || null },
            { "op": "replace", "path": "/NominalPower_Wp", "value": parseFloat(body.NominalPower_Wp) || null },
            { "op": "replace", "path": "/Inverter_InstantPower_kW", "value": parseFloat(body.Inverter_InstantPower_kW) || null },
            { "op": "replace", "path": "/Roof_LoadCapacity", "value": parseFloat(body.Roof_LoadCapacity) || null },
            { "op": "replace", "path": "/Performance_Ratio", "value": parseFloat(body.Performance_Ratio) || null },
            { "op": "replace", "path": "/Panel_Model", "value": parseFloat(body.Panel_Model) || null },
            { "op": "replace", "path": "/Panel_ID", "value": parseFloat(body.Panel_ID) || null },
            { "op": "replace", "path": "/EnergyClass", "value": parseFloat(body.EnergyClass) || null },
            { "op": "replace", "path": "/Inverter_MPPTs", "value": parseFloat(body.Inverter_MPPTs) || null },
            { "op": "replace", "path": "/Roof_Azimuth", "value": parseFloat(body.Roof_Azimuth) || null },
            { "op": "replace", "path": "/String_DC_Current", "value": parseFloat(body.String_DC_Current) || null },
            { "op": "replace", "path": "/Inverter_EnergyProduced_kWh", "value": parseFloat(body.Inverter_EnergyProduced_kWh) || null },
            { "op": "replace", "path": "/STC_Efficiency", "value": parseFloat(body.STC_Efficiency) || null },
            { "op": "replace", "path": "/Plant_Availability", "value": parseFloat(body.Plant_Availability) || null },
            { "op": "replace", "path": "/CO2_Avoided_kg", "value": parseFloat(body.CO2_Avoided_kg) || null },
            { "op": "replace", "path": "/Inverter_Model", "value": parseFloat(body.Inverter_Model) || null },
            { "op": "replace", "path": "/Temperature_Coeff", "value": parseFloat(body.Temperature_Coeff) || null },  
            { "op": "replace", "path": "/Building_Address", "value": parseFloat(body.Building_Address) || null },
            { "op": "replace", "path": "/ConstructionYear", "value": parseFloat(body.ConstructionYear) || null },
            { "op": "replace", "path": "/BuildingGeometry3D", "value": parseFloat(body.BuildingGeometry3D) || null },
            { "op": "replace", "path": "/String_MPPT_Connection", "value": parseFloat(body.String_MPPT_Connection) || null },
            { "op": "replace", "path": "/Field_Layout", "value": parseFloat(body.Field_Layout) || null },



             { "op": "replace", "path": "/Battery_SoC_Percent", "value": parseFloat(body.Battery_SoC_Percent) || null },
             { "op": "replace", "path": "/EnergyProduced_kWh", "value": parseFloat(body.EnergyProduced_kWh) || null },
             { "op": "replace", "path": "/CO2_Avoided_kg_panelLamp", "value": parseFloat(body.CO2_Avoided_kg_panelLamp) || null },
             { "op": "replace", "path": "/Panel_Status", "value": parseFloat(body.Panel_Status) || null },



            { "op": "replace", "path": "/Humidity", "value": parseFloat(body.Humidity) || null },
            { "op": "replace", "path": "/Temperature", "value": parseFloat(body.Temperature) || null },
            { "op": "replace", "path": "/MoneySaving", "value": parseFloat(body.MoneySaving) || null },
            { "op": "replace", "path": "/PricePerKWh", "value": parseFloat(body.PricePerKWh) || null },
            { "op": "replace", "path": "/Floor", "value": parseFloat(body.Floor) || null },
            { "op": "replace", "path": "/Occupancy", "value": parseFloat(body.Occupancy) || null },
            { "op": "replace", "path": "/NumberOfRooms", "value": parseFloat(body.NumberOfRooms) || null },
            { "op": "replace", "path": "/Building_ID", "value": parseFloat(body.Building_ID) || null },
            { "op": "replace", "path": "/Apartment_ID", "value": parseFloat(body.Apartment_ID) || null },
            { "op": "replace", "path": "/EnergyConsumption", "value": parseFloat(body.EnergyConsumption) || null },
            { "op": "replace", "path": "/EnergyConsumptionCost", "value": parseFloat(body.EnergyConsumptionCost) || null },


            { "op": "replace", "path": "/HumidityAvg_Palace", "value": parseFloat(body.HumidityAvg_Palace) || null },
            { "op": "replace", "path": "/TemperatureAvg_Palace", "value": parseFloat(body.TemperatureAvg_Palace) || null },
            { "op": "replace", "path": "/MoneySavingSumOfApts_Palace", "value": body.MoneySavingSumOfApts_Palace || null },
            { "op": "replace", "path": "/EnergySalesRevenue", "value": body.EnergySalesRevenue || null },
            { "op": "replace", "path": "/MoneySaving_Palace", "value": body.MoneySaving_Palace || null },
            { "op": "replace", "path": "/EnergyProduction_Palace", "value": parseFloat(body.EnergyProduction_Palace) || null },
            { "op": "replace", "path": "/Address_Palace", "value": parseFloat(body.Address_Palace) || null },
            { "op": "replace", "path": "/Palazzo_ID_Palace", "value": parseFloat(body.Palazzo_ID_Palace) || null },
            { "op": "replace", "path": "/EnergyConsumption_Palace", "value": parseFloat(body.EnergyConsumption_Palace) || null },
            { "op": "replace", "path": "/EnergyPurchaseCost_Palace", "value": body.EnergyPurchaseCost_Palace || null },
            { "op": "replace", "path": "/SelfConsumption_Palace", "value": parseFloat(body.SelfConsumption_Palace) || null },
            { "op": "replace", "path": "/CostConsumptionEffective_Palace", "value": parseFloat(body.CostConsumptionEffective_Palace) || null },
            { "op": "replace", "path": "/InstantPowerPV_Palace", "value": parseFloat(body.InstantPowerPV_Palace) || null },
            { "op": "replace", "path": "/InverterEfficiency_Palace", "value": parseFloat(body.InverterEfficiency_Palace) || null },
            { "op": "replace", "path": "/SolarPanelCount_Palace", "value": parseFloat(body.SolarPanelCount_Palace) || null }


        ].filter(patch => patch.value !== null); 

        context.log(`Documento di patch generato: ${JSON.stringify(twinPatch)}`);

        const updatedTwin = await serviceClient.updateDigitalTwin(deviceId, twinPatch);
        context.log(`Digital Twin aggiornato con successo: ${inspect(updatedTwin)}`);
    } catch (error) {
        context.log(`Errore durante l'aggiornamento del Digital Twin: ${error.message}`);
        context.log(error.stack);
    }
};

