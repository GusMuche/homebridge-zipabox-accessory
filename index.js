'use strict'

var Zipabox = require('./zipabox');

var Service, Characteristic;

module.exports = function(homebridge) {
  /* this is the starting point for the plugin where we register the accessory */
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-ZipaAccessory", "ZipaAccessory", ZipaAccessory)
}

class ZipaAccessory {
  constructor (log, config) {
    /*
    * The constructor function is called when the plugin is registered.
    * log is a function that can be used to log output to the homebridge console
    * config is an object that contains the config for this plugin that was defined the homebridge config.json
    */

    /* Default */
    /* assign both log and config to properties on 'this' class so we can use them in other methods */
    this.log = log;
    this.config = config;

    /* Loading all the config of the services */
    this.type = config["type"];
    this.name = config["name"];// || "-noname-";
    //console.log("Name configured :",this.name)
    this.IP = config["server_ip"]; // Change to server_IP > ! config
    this.baseURL = "http://"+this.IP+":8080/zipato-web/v2/"; // Local
    //this.baseURL = "https://my.zipato.com:443/zipato-web/v2/"; // Remote - not tested
    /* Debug and testValue */
    this.debug = config["debug"] || false;
    this.debug && this.log("Debug ?: " + this.debug);
    this.debug && this.log("URL créée:  " + this.baseURL);
    this.testValue = config["testValue"] || null;
    if(this.testValue != null)
      this.debug && this.log("Test value fixed by user at ", this.testValue);
    /* UUID of accessory */
    this.uuid = config["uuid"];
    this.uuidB = config["uuidB"] || null;
    if(this.uuiB != null)
      this.debug && this.log("A second Characteristic was added with the uuid",this.uuidB)
    /* Refresh for timePolling */
    this.timePolling = config["refresh"] || 0;
    if(this.timePolling != 0)
      this.debug && this.log("User request to refresh the value after (seconds)",this.timePolling);
    this.timePolling = this.timePolling * 1000; // turn to milliseconds
    /* Optional Battery Limit specified */
    this.batteryLimit = config["batteryLimit"] || 0;
    if(this.batteryLimit > 100 || this.batteryLimit < 0 || this.type == "door" || this.type == "window"){
      this.debug && this.log("Configuration error : batteryLimit fixed to 0.");
      this.batteryLimit = 0;
    }
    /* Optional noStatus to avoid device request */
    this.noStatus = config["noStatus"] || false;
    if(this.noStatus != false && this.noStatus != true){
      this.debug && this.log("Configuration error : noStatus fixed to false");
      this.noStatus = false;
    }
    if(this.type == "alarm")
      this.noStatus = true;
    /* Optional reverse Value */
    this.reverseValue = config["reverse"] || false;
    if(this.reverseValue != false && this.reverseValue != true){
      this.debug && this.log("Configuration error : reverse fixed to false");
      this.reverseValue = false;
    }
    if(this.type == "alarm")
      this.reverseValue = false;
    /* PIN for alarm accessory */
    this.pin = config["pin"] || "noPIN";
    if(this.pin != "noPin")
      this.debug && this.log("Pin for alarm option are specified");
    if(this.pin == "noPIN" && this.type== "alarm"){ // Manage missing PIN for alarm
      this.log("ERROR : The 'pin' parameter must be set to configure an alarm type");
      this.log("ERROR : type is set to switch to avoid homebridge crash");
      this.name = this.name + " - MISSING PIN";
      this.type = "switch";
    }

    /* Empty datas */
    this.deviceUUID = null; // will be fixe after connection TODO : to keep or not ?
    this.timeOut = null; // will be launch after connection

    /* Create and connect to the Box */
    this.zipabox = new Zipabox(this.debug,this.baseURL,this.log,config["USERNAME"],config["PASSWORD"]); // tentative de créer la box
    this.connectTheBox();
    if(this.timePolling > 0)
      this.statusPolling();

    /*
    * A HomeKit accessory can have many "services". This will create our base service,
    * Service types are defined in this code: https://github.com/KhaosT/HAP-NodeJS/blob/master/lib/gen/HomeKitTypes.js
    * Search for "* Service" to tab through each available service type.
    * Take note of the available "Required" and "Optional" Characteristics for the service you are creating
    */
    switch(this.type){
      case "switch":
        this.debug && this.log("Add a Switch Accessory");
        this.service = new Service.Switch(this.name);
        break;
      case "light":
        this.debug && this.log("Add a LightBulb Accessory");
        this.service = new Service.Lightbulb(this.name);
        break;
      case "outlet":
        this.debug && this.log("Add an Outlet Accessory");
        this.service = new Service.Outlet(this.name);
        break;
      case "temperature":
        this.debug && this.log("Add an Temperature Sensor Accessory");
        this.service = new Service.TemperatureSensor(this.name);
        break;
      case "ambient":
        this.debug && this.log("Add an Light Sensor Accessory");
        this.service = new Service.LightSensor(this.name);
        break;
      case "motion":
        this.debug && this.log("Add an Motion Sensor Accessory");
        this.service = new Service.MotionSensor(this.name);
        break;
      case "contact":
        this.debug && this.log("Add an Contact Sensor Accessory");
        this.service = new Service.ContactSensor(this.name);
        break;
      case "window":
        this.debug && this.log("Add an Window Accessory");
        this.service = new Service.Window(this.name);
        break;
      case "door":
        this.debug && this.log("Add an Door Accessory");
        this.service = new Service.Door(this.name);
        break;
      case "leak":
        this.debug && this.log("Add a Leak Sensor Accessory");
        this.service = new Service.LeakSensor(this.name);
        break;
      case "battery":
        this.debug && this.log("Add a Battery Accessory");
        this.service = new Service.BatteryService(this.name);
        break;
      case "co2":
        this.debug && this.log("Add a Carbon Monoxide Sensor Accessory");
        this.service = new Service.CarbonMonoxideSensor(this.name);
        break;
      case "alarm":
        this.debug && this.log("Add a Security System Accessory");
        this.service = new Service.SecuritySystem(this.name);
        break;
      default:
        this.debug && this.log("Add a default Switch Accessory");
        this.service = new Service.Switch(this.name);
    }
  }

  connectTheBox(){
    return this.zipabox.initUser()
    .then(this.zipabox.connectUser.bind(this.zipabox))
    // .then(function getNameFromBoxIfNeeded(connectionResponse){
    //   return this.zipabox.getDeviceName(this.uuid);
    // }.bind(this))
    // .then(function saveName(deviceName){
    //   return new Promise(function(resolve,reject){
    //     if (this.name == "-noname-"){
    //       this.debug || this.log("Name need to be change :",deviceName);
    //       this.name = deviceName;
    //       //this.service.updateCharacteristic(Characteristic.Name,deviceName);
    //       resolve(this.name)
    //     }else{
    //       this.debug || this.log("Name will be keeped :",this.name);
    //       resolve(this.name)
    //     } // end if-else
    //   }.bind(this)) // end Promise
    // }.bind(this)) // end then function
    .then(function manageDeviceUUID(connectionResponseOrDeviceName){
      return new Promise(function (resolve,reject){
        if(this.noStatus == true){ // no device Status available > return simple uuid
          resolve(this.uuid);
        }else{
          this.zipabox.getDeviceUUID(this.uuid)
          .then(function saveDeviceUUID(deviceUUID){
            this.debug && this.log("Device UUID found :",deviceUUID);
            this.deviceUUID = deviceUUID;
            resolve(deviceUUID);
          }.bind(this));
        }
      }.bind(this)); // end returned Promise
    }.bind(this))
    .then(function connectSecurityIfNeeded(deviceUUIDorUUID){
      if(this.type == "alarm"){
        this.debug && this.log("Alarm found after zipa connection > connect to the alarm.")
        return this.zipabox.initSecurity(this.pin)
        .then(this.zipabox.connectSecurity.bind(this.zipabox));
      }else{
        return deviceUUID; // same for previous Promise without alarm
      }
    }.bind(this))
    .catch(function manageError(error) {
      this.log("Error on connectBox : ",error);
	    throw new Error(error);
    }.bind(this));
  } // and connectTheBox function

  statusPolling(){
    this.debug && this.log("Forced refresh after (seconds):",this.timePolling);
    this.timeOut = setTimeout(function refreshStatus(){
      //this.getOnCharacteristicHandler(null);
      if(this.type == "switch" || this.type == "light" || this.type == "outlet") // TODO: find the open Characteristic
        this.service.getCharacteristic(Characteristic.On).getValue();
      if(this.type == "temperature")
        this.service.getCharacteristic(Characteristic.CurrentTemperature).getValue();
      if(this.type == "ambient")
        this.service.getCharacteristic(Characteristic.CurrentAmbientLightLevel).getValue();
      if(this.type == "motion")
        this.service.getCharacteristic(Characteristic.MotionDetected).getValue();
      if(this.type == "contact")
        this.service.getCharacteristic(Characteristic.ContactSensorState).getValue();
      if(this.type == "leak")
        this.service.getCharacteristic(Characteristic.LeakDetected).getValue();
      if(this.type == "co2")
        this.service.getCharacteristic(Characteristic.CarbonMonoxideSensor).getValue();
      if(this.type == "window" || this.type == "door"){
        this.service.getCharacteristic(Characteristic.CurrentPosition).getValue();
        this.service.getCharacteristic(Characteristic.TargetPosition).getValue();
      }
      if(this.type == "battery"){
        this.service.getCharacteristic(Characteristic.BatteryLevel).getValue();
        this.service.getCharacteristic(Characteristic.ChargingState).getValue();
      }
      if(this.type == "alarm"){
        this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState).getValue();
        //this.service.getCharacteristic(Characteristic.SecuritySystemTargetState).getValue();
      }
      this.statusPolling();
    }.bind(this),this.timePolling)// end function of timeout
  } // end statusPolling function

  getServices () {
    /*
    * The getServices function is called by Homebridge and should return an array of Services this accessory is exposing.
    * It is also where we bootstrap the plugin to tell Homebridge which function to use for which action.
    */

    /* Create a new information service. This just tells HomeKit about our accessory. */
    const informationService = new Service.AccessoryInformation()
      .setCharacteristic(Characteristic.Manufacturer, this.config["manufacturer"])
      .setCharacteristic(Characteristic.Model, this.config["model"])
      .setCharacteristic(Characteristic.SerialNumber, this.config["serial"])

    this.debug && this.log("Identification du matériel : ",this.config["serial"])

    /*
    * For each of the service characteristics we need to register setters and getter functions
    * 'get' is called when HomeKit wants to retrieve the current state of the characteristic
    * 'set' is called when HomeKit wants to update the value of the characteristic
    */
    if(this.type == "switch" || this.type == "light" || this.type == "outlet"){
      this.service.getCharacteristic(Characteristic.On)
        .on('get', this.getOnCharacteristicHandler.bind(this))
        .on('set', this.setOnCharacteristicHandler.bind(this));
    }
    if(this.type == "temperature"){
      this.service.getCharacteristic(Characteristic.CurrentTemperature)
        .on('get', this.getOnCharacteristicHandler.bind(this));
    }
    if(this.type == "ambient"){
      this.service.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
        .on('get', this.getOnCharacteristicHandler.bind(this));
    }
    if(this.type == "motion"){
      this.service.getCharacteristic(Characteristic.MotionDetected)
        .on('get', this.getOnCharacteristicHandler.bind(this));
    }
    if(this.type == "contact"){
      this.service.getCharacteristic(Characteristic.ContactSensorState)
        .on('get', this.getOnCharacteristicHandler.bind(this));
    }
    if(this.type == "window" || this.type == "door"){
      this.service.getCharacteristic(Characteristic.CurrentPosition)
        .on('get', this.getOnCharacteristicHandler.bind(this))
        .on('set', this.setOnCharacteristicHandler.bind(this));
      this.service.getCharacteristic(Characteristic.TargetPosition)
        .on('get', this.getOnCharacteristicHandler.bind(this))
        .on('set', this.setOnCharacteristicHandler.bind(this));
      this.service.getCharacteristic(Characteristic.PositionState)
        .on('set', this.setOnCharacteristicHandler.bind(this));
      this.service.getCharacteristic(Characteristic.HoldPosition)
        .on('get', function(callback){callback(null,true);});
    }
    if(this.type == "leak"){
      this.service.getCharacteristic(Characteristic.LeakDetected)
      .on('get', this.getOnCharacteristicHandler.bind(this));
    }
    if(this.type == "co2"){
      this.service.getCharacteristic(Characteristic.CarbonMonoxideDetected)
      .on('get', this.getOnCharacteristicHandler.bind(this));
    }
    if(this.type == "battery"){
      this.service.getCharacteristic(Characteristic.BatteryLevel)
      .on('get', this.getOnCharacteristicHandler.bind(this));
      this.service.getCharacteristic(Characteristic.ChargingState)
      .on('get', this.getOnCharacteristicHandlerB.bind(this));
    }
    if(this.type == "alarm"){
      this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState)
      .on('get', this.getOnSecurityCurrentHandler.bind(this));
      // this.service.getCharacteristic(Characteristic.SecuritySystemTargetState)
      // .on('get', this.getOnSecurityTargetHandler.bind(this));
    }
    if(this.batteryLimit != 0){
      this.service.getCharacteristic(Characteristic.StatusLowBattery) // Normal = 0, Low = 1
        .on('get', this.getStatusBatteryCharacteristic.bind(this));
    }

    // if(this.type == "outlet"){
    //   this.service.getCharacteristic(Characteristic.OutletInUse)
    //     .on('get', this.getOutletInUseCharacteristicHandler.bind(this))
    //   this.log("Création du getOutletInUse");
    //  }

    //this.service.addOptionalCharacteristic(Characteristic.StatusFault)
    //.StatusFault('get', this.getStatusActiveCharacteristicHandler.bind(this))

    /* Return both the main service (this.service) and the informationService */
    return [informationService, this.service]
  }

  getStatusBatteryCharacteristic (callback){
    this.debug && this.log('calling getStatusBatteryCharacteristic');
    var error = null;
    this.zipabox.getDeviceStatus(this.deviceUUID,this.noStatus)
    .catch(function(error){ // Check if disconnect, if then reconnect
      if (error.message == "Unauthorized" || error.message == "Unauthorized "){ // || error.message == "Bad Request " > for test
        this.log("Found Unauthorized error > need reconnection : ", "-"+ error.message + "-");
        /* Try to reconnect the Box */
        return this.connectTheBox()
        .then(function checkStatus(connectionAnswer){
          if(connectionAnswer != "success"){
            this.log("Reconnection failed. Error :",error)
            throw error;
            //return ("testErrorChaining"); // For test with chaining after error
          }else{
            this.debug && this.log("Reconnection success > get Device Status");
            return this.zipabox.getDeviceStatus(this.deviceUUID,this.noStatus); // regive the status
          }
        }.bind(this)) // End Unauthorized error manage
        .catch(function manageError(error){
           throw new Error(error);
        });
      }else{ // Rethrow error that we can't manage here
        this.log("Found error, not manage :", error.message + "-");
        throw error;
      }
    }.bind(this))
    .then(function manageStatus(deviceStatus){
      return new Promise(function(resolve,reject){
        this.debug && this.log("Test Value in manage Status : ",deviceStatus);
        if(deviceStatus == true){ // Device is Online > go forward
          resolve(this.deviceUUID);
        }else{ // Device is not online
          error = "Device not online";
          reject(error);
        }
      }.bind(this)) // end promise
    }.bind(this)) // end then
    .then(this.zipabox.getDeviceBatteryLevel.bind(this.zipabox))
    .then(function (batteryValue){
      var underLevel = 0;
      if(batteryValue < this.batteryLimit)
        underLevel = 1;
      this.debug && this.log("Battery status returned to callback:",underLevel);
      callback(error,underLevel);
    }.bind(this))
    .catch(function manageError(error){
      //this.log("Test Value in manage Error : ",deviceStatus);
      this.log("Error on getOnCharacteristicHandler :",error);
      callback(error,undefined);
       //throw new Error(error);
    }.bind(this));
    //callback(null,0);
  }

  // getOutletInUseCharacteristicHandler (callback) {
  //   this.debug && this.log("Outlet in getOutletinUse :",this.outletInUseTest);
  //   callback(null,this.outletInUseTest);
  // }

  // getValueCharacteristicHandler (callback){ // based on getOnCharacteristicHandler
  //   this.debug && this.log('calling getValueCharacteristicHandler');
  //   var error = null;
  //   this.zipabox.getDeviceStatus(this.deviceUUID,this.noStatus)
  //   .catch(function(error){ // Check if disconnect, if then reconnect
  //     if (error.message == "Unauthorized" || error.message == "Unauthorized "){ // || error.message == "Bad Request " > for test
  //       this.log("Found Unauthorized error > need reconnection : ", "-"+ error.message + "-");
  //       /* Try to reconnect the Box */
  //       return this.connectTheBox()
  //       .then(function checkStatus(connectionAnswer){
  //         if(connectionAnswer != "success"){
  //           this.log("Reconnection failed. Error :",error)
  //           throw error;
  //           //return ("testErrorChaining"); // For test with chaining after error
  //         }else{
  //           this.debug && this.log("Reconnection success > get Device Status");
  //           return this.zipabox.getDeviceStatus(this.deviceUUID,this.noStatus); // regive the status
  //         }
  //       }.bind(this)) // End Unauthorized error manage
  //       .catch(function manageError(error){
  //          throw new Error(error);
  //       });
  //     }else{ // Rethrow error that we can't manage here
  //       this.log("Found error, not manage :", error.message + "-");
  //       throw error;
  //     }
  //   }.bind(this))
  //   .then(function manageStatus(deviceStatus){
  //     return new Promise(function(resolve,reject){
  //       this.log("Test Value in manage Status : ",deviceStatus);
  //       if(deviceStatus == true){ // Device is Online
  //         resolve(this.uuid);
  //       }else{ // Device is not online
  //         error = "Device not online";
  //         reject(error);
  //       }
  //     }.bind(this)) // end promise
  //   }.bind(this)) // end then
  //   .then(this.zipabox.getAttributesValue.bind(this.zipabox))
  //   .then(function (accessoryValue){
  //     this.debug && this.log("Accessory Value returned vy callback:",accessoryValue);
  //     callback(error,accessoryValue);
  //   }.bind(this))
  //   .catch(function manageError(error){
  //     //this.log("Test Value in manage Error : ",deviceStatus);
  //     this.log("Error on getOnCharacteristicHandler :",error);
  //     callback(error,undefined);
  //      //throw new Error(error);
  //   }.bind(this));
  // }

  setOnCharacteristicHandler (value, callback) {
        /* this is called when HomeKit wants to update the value of the characteristic as defined in our getServices() function */

        /*
        * The desired value is available in the `value` argument.
        * This is just an example so we will just assign the value to a variable which we can retrieve in our get handler
        */
        //this.isOn = value; // true  at the lest on version 0.0.15

        /* Log to the console the value whenever this function is called */
        this.debug && this.log('calling setOnCharacteristicHandler', value);

        if(this.type == "window" || this.type == "door"){
          this.debug && this.log("Set method for a Window or Door > stop signal");
          //var error = new Error("Not implemented yet.");
          this.service.getCharacteristic(Characteristic.CurrentPosition).getValue();
          this.service.getCharacteristic(Characteristic.TargetPosition).getValue();
          callback(null);
          return;
        }

        /*
        * The callback function should be called to return the value >>???
        * The first argument in the function should be null unless and error occured
        */
        // callback(null) // initial value
        this.zipabox.putAttributesValueRequest(this.uuid,value)
        .then(function launchCallBack(resp){
          //console.log("launchCallBack :",resp); // TODO: delete
          callback(resp); // TODO : check if ok
        })
        .catch(function manageError(error) {
    	    throw new Error(error);
        });
      //}
  } // Fin setOnCharacteristicHandler

  getOnCharacteristicHandler (callback) {
       /*
        * this is called when HomeKit wants to retrieve the current state of the characteristic as defined in our getServices() function
        * it's called each time you open the Home app or when you open control center
        */

       /* Log to the console the value whenever this function is called */
       this.debug && this.log('calling getOnCharacteristicHandler');

       /* Use this block to eventually force a value for test purpose */
       // if(this.testValue == true){
       //   callback(null,true);
       //   return;
       // }
       // if(this.testValue == false){
       //   callback(null,false);
       //   return;
       // }

       /*
        * The callback function should be called to return the value
        * The first argument in the function should be null unless and error occured
        * The second argument in the function should be the current value of the characteristic
        * This is just an example so we will return the value from `this.isOn` which is where we stored the value in the set handler
        */
       //callback(null, this.isOn) // example commande
       var error = null;
       this.zipabox.getDeviceStatus(this.deviceUUID,this.noStatus)
       .catch(function(error){ // Check if disconnect, if then reconnect
         if (error.message == "Unauthorized" || error.message == "Unauthorized "){ // || error.message == "Bad Request " > for test
           this.log("Found Unauthorized error > need reconnection : ", "-"+ error.message + "-");
           /* Try to reconnect the Box */
           return this.connectTheBox()
           .then(function checkStatus(connectionAnswer){
             if(connectionAnswer != "success"){
               this.log("Reconnection failed. Error :",error)
               throw error;
               //return ("testErrorChaining"); // For test with chaining after error
             }else{
               this.debug && this.log("Reconnection success > get Device Status");
               return this.zipabox.getDeviceStatus(this.deviceUUID,this.noStatus); // regive the status
             }
           }.bind(this)) // End Unauthorized error manage
           .catch(function manageError(error){
         	    throw new Error(error);
           });
         }else{ // Rethrow error that we can't manage here
           this.log("Found error, not manage :", error.message + "-");
           throw error;
         }
       }.bind(this))
       .then(function manageStatus(deviceStatus){
         return new Promise(function(resolve,reject){
           this.debug && this.log("Test Value in manage Status : ",deviceStatus);
           if(deviceStatus == true){ // Device is Online
             resolve(this.uuid);
           }else{ // Device is not online
             error = "Device not online";
             reject(error);
           }
         }.bind(this)) // end promise
       }.bind(this)) // end then
       .then(this.zipabox.getAttributesValue.bind(this.zipabox))
       .then(function (accessoryValue){
         // Reverse the value if requested by the configuration
         this.debug && this.log("Accessory Value returned by callback:",accessoryValue);
         var returnedValue = accessoryValue;
         if(this.reverseValue == true){ // User ask to reverse
           if(returnedValue == true){
             returnedValue = false;
           }else{
             returnedValue = true;
           }
           this.debug && this.log("Configuration have request to reverse the value to :",returnedValue)
         } // end reverse block
         if(this.type == "window" || this.type == "door"){ // Window type, need to return a digit between 0 and 100
           this.debug && this.log("Window or Door found in get Method. returnedValue :",returnedValue)
           if(returnedValue)
            returnedValue = 100;
          else
            returnedValue = 0;
         }
         callback(error,returnedValue);
       }.bind(this))
       .catch(function manageError(error){
         //this.log("Test Value in manage Error : ",deviceStatus);
         this.log("Error on getOnCharacteristicHandler :",error);
         callback(error,undefined);
   	      //throw new Error(error);
       }.bind(this));
  } // end getOnCharacteristicHandler

  getOnCharacteristicHandlerB (callback) { // Use for Get with uuidB
       /* Log to the console the value whenever this function is called */
       this.debug && this.log('calling getOnCharacteristicHandlerB');

       /* Use this block to eventually force a value for test purpose */
       // if(this.testValue != null){
       //   callback(null,0);
       //   return;
       // }

       var error = null;
       this.zipabox.getAttributesValue(this.uuidB)
       .then(function (accessoryValue){
         // Reverse the value if requested by the configuration
         this.debug && this.log("Accessory Value returned by callback B:",accessoryValue);
         var returnedValue = accessoryValue;
         if(this.type == "battery"){ // Window type, need to return a digit between 0 and 100
           this.debug && this.log("Battery to manage in getOnCharacteristicHandlerB. returnedValue :",returnedValue)
           /* ChargingState Property - enum of Int
           0 - none - The battery isn’t charging.
           1 - inProgress - The battery is charging.
           2 - notChargeable - The battery can’t be charged.
           ----
           Zipato :
           0 - Normal > 1
           1 - Discharging > 0
           */
           if(returnedValue == 0)
            returnedValue = 1;
          else
            returnedValue = 0;
         }
         callback(error,returnedValue);
       }.bind(this))
       .catch(function manageError(error){
         //this.log("Test Value in manage Error : ",deviceStatus);
         this.log("Error on getOnCharacteristicHandler :",error);
         callback(error,undefined);
   	      //throw new Error(error);
       }.bind(this));
  } // end getOnCharacteristicHandlerB

  getOnSecurityCurrentHandler (callback) { // Use for get Alarm status
       /* Log to the console the value whenever this function is called */
       this.debug && this.log('calling getOnSecurityCurrentHandler');

       /* Use this block to eventually force a value for test purpose */
       // if(this.testValue != null){
       //   callback(null,this.testValue);
       //   return;
       // }

       var error = null;
       this.zipabox.getSecurityStatus(this.uuid)
       .catch(function manageReconnection(errorConnection){
         if (errorConnection.message == "Unauthorized" || errorConnection.message == "Unauthorized "){ // || error.message == "Bad Request " > for test
           this.log("Found Unauthorized error in security Status > need reconnection : ", "-"+ errorConnection.message + "-");
           /* Try to reconnect the Box */
           return this.connectTheBox()
           .then(function checkStatus(connectionAnswer){
             if(connectionAnswer != "success"){
               this.log("Reconnection failed. Error :",error)
               throw error;
               //return ("testErrorChaining"); // For test with chaining after error
             }else{
               this.debug && this.log("Reconnection success > getOnSecurityCurrentHandler");
               return this.zipabox.getSecurityStatus(this.uuid); // regive the security value
             }
           }.bind(this)) // End Unauthorized error manage
           .catch(function manageError(error){
         	    throw new Error(error);
           });
         }
       }.bind(this))
       .then(function manageCallback(securityCurrentState){
         callback(error,securityCurrentState);
       }.bind(this))
       .catch(function manageError(error){
         //this.log("Test Value in manage Error : ",deviceStatus);
         this.log("Error on getOnSecurityCurrentHandler :",error);
         callback(error,undefined);
          //throw new Error(error);
       }.bind(this));
  } // end getOnSecurityCurrentHandler
} // end Class
