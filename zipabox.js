'use strict';

// Try to require cryto https://nodejs.org/api/crypto.html#crypto_determining_if_crypto_support_is_unavailable
let crypto;
try {
  crypto = require('crypto');
} catch (err) {
  console.log('crypto support is disabled!');
}

// var request = require('request');
// require('request').debug = true; // Mode Debug
const nodeFetch = require('node-fetch')
const fetch = require('fetch-cookie')(nodeFetch)
const myInitGet = { // used for all get fetch command
  method: 'get',
  cache: 'no-cache',
  keepalive: 'true',
  credentials: 'same-origin'
};

class Zipabox{

  constructor (debug,url,log,user,password) {
    this.debug = debug;
    this.baseURL = url;
    this.log = log;
    this.user = user;
    this.password = password;
    //this.cookieJar = request.jar(); // Create a new jar Cookie
    //this.zipaRequest = request.defaults({jar: this.cookieJar});
    this.debug && this.log("Zipabox lien : " + this.baseURL);
  }

  initUser(){
    // Init the connection to get the nonce (chain through a Promise)
    return new Promise(function(resolve, reject) {
      this.debug && this.log("Methode initUser()");
      this.debug && this.log("URL pour init : " + this.baseURL +'user/init');
      fetch(this.baseURL +'user/init', myInitGet)
      .then(fstatus)
      .then(fjson)
      .then(function fgetNonce(jsonResponse){
        return new Promise(function(resolve,reject){
          resolve(jsonResponse.nonce); // TODO : make a simple return
        });//end promise
      })// end function fgetNonce
      .then(function resolveTheNonce(nonce){
        console.log("Resolve the Nonce",nonce)
        resolve(nonce);
      })
      .catch(function manageError(error) {
        console.log('Error occurred!', error);// TODO ADD gestion Error
        reject(error);
      });// end fetch chaining
    }.bind(this));// End Promise
  } // end initUser

  connectUser(nonce){
    // Request the connection
    return new Promise(function(resolve,reject){
      this.debug && this.log("Methode connectUser()");
      this.debug && this.log("Nonce for connect :",nonce);
      // Calculate the token
      var passwordHash = crypto.createHash('sha1').update(this.password).digest('hex');
      this.debug && this.log("Password hashed :" + passwordHash);  // todo : BEWARE : will be display also if debug = false
      var token = crypto.createHash('sha1').update(nonce + passwordHash).digest('hex');
      this.debug && this.log("Token :" + token);
      this.debug && this.log("URL pour login: " + this.baseURL +'user/login?username='+this.user+'&token='+token);
      // Login the user
      fetch(this.baseURL +'user/login?username='+this.user+'&token='+token,myInitGet)
      .then(fstatus)
      .then(fjson)
      .then(function giveResult(jsonReponse){
        //console.log("Result connectUser",jsonReponse);
        //console.log("Connection to the Zipabox : ",jsonReponse.success);
        resolve(jsonReponse.success);
      })
      .catch(function manageError(error) {
        reject(error);
      });// end fetch chaining
    }.bind(this)); // end Promise
  } // end connectUser

  initSecurity(pin){
    // Init the connection to get the nonce (chain through a Promise)
    return new Promise(function(resolve, reject) {
      this.debug && this.log("Methode initSecurity()");
      this.debug && this.log("URL pour init : " + this.baseURL +'security/session/init');
      fetch(this.baseURL +'security/session/init', myInitGet)
      .then(fstatus)
      .then(fjson)
      .then(function fixAllInfos(jsonResponse){
        let secureSessionId = jsonResponse.response.secureSessionId;
        let nonce = jsonResponse.response.nonce;
        let salt = jsonResponse.response.salt;
        resolve([secureSessionId, nonce, salt, pin]);
      })
      .catch(function manageError(error) {
        console.log('Error occurred!', error);// TODO ADD gestion Error
        reject(error);
      });// end fetch chaining
    }.bind(this));// End Promise
  } // end initSecurity

  connectSecurity([secureSessionId, nonce, salt, pin]){
    // Request the connection
    return new Promise(function(resolve,reject){
      this.debug && this.log("Methode connectSecurity()");
      this.debug && this.log("secureSessionId for connectSecurity :",secureSessionId);
      this.debug && this.log("Nonce for connectSecurity :",nonce);
      this.debug && this.log("Salt for connectSecurity :",salt);
      // Calculate saltPin
      if(pin == "noPIN")
        reject("No Pin specified - Connection to security not possible.")
      var saltPin = salt + pin;
      this.debug && this.log("saltPin :" + saltPin);
      // Calculate the token
      var saltPinHash = crypto.createHash('sha1').update(saltPin).digest('hex');
      this.debug && this.log("saltPinHash :" + saltPinHash);
      var token = crypto.createHash('sha1').update(nonce + saltPinHash).digest('hex');
      this.debug && this.log("Token :" + token);
      this.debug && this.log("URL pour connectSecurity: " + this.baseURL +'security/session/login/'+secureSessionId+'?token='+token);
      // Connect the Security
      fetch(this.baseURL +'security/session/login/'+secureSessionId+'?token='+token,myInitGet)
      .then(fstatus)
      .then(fjson)
      .then(function giveResult(jsonReponse){
        console.log("Result connectSecurity",jsonReponse);
        console.log("Request to the connectSecurity : ",jsonReponse.success);
        console.log("Connection to the connectSecurity : ",jsonReponse.response.success);
        resolve(jsonReponse.success);
      })
      .catch(function manageError(error) {
        reject(error);
      });// end fetch chaining
    }.bind(this)); // end Promise
  } // end connectSecurity

  getDeviceUUID(attributeUUID){ // return the device UUID
    return new Promise(function(resolve, reject){
      var attributeRequest = '?network=false&device=true&endpoint=false&clusterEndpoint=false&definition=false&config=false&room=false&icons=false&value=false&parent=false&children=false&full=false&type=false';
      this.debug && this.log("Methode getDeviceUUID()");
      //this.debug && this.log("URL device :",this.baseURL + 'attributes/' + attributeUUID + attributeRequest);
      // Check if uuid is a device or not
        // TODO ADD CHECK METHOD
      // Get the id with fetch
      fetch(this.baseURL + 'attributes/' + attributeUUID + attributeRequest,myInitGet)
      .then(fstatus)
      .then(fjson)
      .then(function giveDeviceUUID(jsonResponse){
        console.log("Response of getDeviceUUID. UUID source :", attributeUUID);
        console.log("Device UUID : ",jsonResponse.device.uuid);
        resolve(jsonResponse.device.uuid);
      }.bind(this))
      .catch(function manageError(error) {
	      reject(error);
      });// End fetch chaining
    }.bind(this));//end Promise
  } // end getDeviceUUID

  // /* Not tested */
  // getDeviceName(attributeUUID){ // return the device Name
  //   return new Promise(function(resolve, reject){
  //     var attributeRequest = '?network=false&device=true&endpoint=false&clusterEndpoint=false&definition=false&config=false&room=false&icons=false&value=false&parent=false&children=false&full=false&type=false';
  //     this.debug && this.log("Methode getDeviceName()");
  //     //this.debug && this.log("URL device :",this.baseURL + 'attributes/' + attributeUUID + attributeRequest);
  //     // Check if uuid is a device or not
  //       // TODO ADD CHECK METHOD
  //     // Get the id with fetch
  //     fetch(this.baseURL + 'attributes/' + attributeUUID + attributeRequest,myInitGet)
  //     .then(fstatus)
  //     .then(fjson)
  //     .then(function giveDeviceUUID(jsonResponse){
  //       console.log("Response of getDeviceName. UUID source :", attributeUUID);
  //       console.log("Device Name : ",jsonResponse.device.name);
  //       resolve(jsonResponse.device.name);
  //     }.bind(this))
  //     .catch(function manageError(error) {
	//       reject(error);
  //     });// End fetch chaining
  //   }.bind(this));//end Promise
  // } // end getDeviceName

  getDeviceStatus(uuidDevice,noStatus){ // Return the device Status
    if(noStatus){ //config say that no device is available > return true
      return new Promise(function(resolve,reject){
        resolve(true);
      });
    }else{
      return new Promise(function(resolve, reject) {
        this.debug && this.log("Methode getDeviceStatus()");
        fetch(this.baseURL + 'devices/' + uuidDevice + '/status',myInitGet)
        .then(fstatus)
        .then(fjson)
        .then(function returnDeviceStatus(jsonResponse){
          console.log("Response of getDeviceStatus :", uuidDevice);
          console.log("Device status :",jsonResponse.state.online);
          resolve(jsonResponse.state.online);
        })
        .catch(function manageError(error) {
          console.log('Error occurred!', error);// TODO ADD gestion Error
          reject(error);
        });// end fetch chaining
      }.bind(this));// End Promise
    }
  } // end getDeviceStatus

  getDeviceBatteryLevel(uuidDevice){ // Return the device Battery Level
    return new Promise(function(resolve, reject) {
      this.debug && this.log("Methode getDeviceBatteryLevel()");
      fetch(this.baseURL + 'devices/' + uuidDevice + '/status',myInitGet)
      .then(fstatus)
      .then(fjson)
      .then(function returnDeviceStatus(jsonResponse){
        console.log("Response of getDeviceBatteryLevel :", uuidDevice);
        console.log("Device battery level :",jsonResponse.state.batteryLevel);
        resolve(jsonResponse.state.batteryLevel);
      })
      .catch(function manageError(error) {
        console.log('Error occurred!', error);// TODO ADD gestion Error
        reject(error);
      });// end fetch chaining
    }.bind(this));// End Promise
  } // end getDeviceBatteryLevel

  getAttributesValue(uuidAttributes){ // Just method to maintain the request, not the value (need to be done)
    return new Promise(function(resolve, reject){
      this.debug && this.log("Methode getAttributesValue()");
      this.debug && this.log("getAttributesValue request : ", this.baseURL + 'attributes/' + uuidAttributes + '/value');
      fetch(this.baseURL + 'attributes/' + uuidAttributes + '/value',myInitGet)
      .then(fstatus)
      .then(fjson)
      .then(function returnDeviceStatus(jsonResponse){
        console.log("Response of getAttributesValue :", uuidAttributes);
        console.log("Response :",jsonResponse.value);
        resolve(jsonResponse.value);
      })
      .catch(function manageError(error) {
        console.log('Error occurred!', error);// TODO ADD gestion Error
        reject(error);
      });// end fetch chaining
    }.bind(this));// End Promise
  }// End getAttributesValue

  getSecurityStatus(uuidPartition){
    /* SecuritySystemCurrentState Property - enum of Int in Homebridge :
    STAY_ARM = 0; > Armée présent
    AWAY_ARM = 1; > Armée absent
    NIGHT_ARM = 2; > Armée nuit
    DISARMED = 3; > Désarmée
    ALARM_TRIGGERED = 4; > zone
    ----
    Zipato :
      armMode :
        DISARMED -> Désarmé >> 3
        AWAY -> Armement total >> 1
        HOME -> Armement partiel >> 0 ou 2
      tripped :
        true || false >> 4 if true
    */
    return new Promise(function(resolve,reject){
      this.debug && this.log("Method getSecurityStatus()");
      this.debg && this.log("getSecurityStatus request : ",this.baseURL + "alarm/partitions/" + uuidPartition + "?alarm=false&zones=false&control=false&attributes=false&config=false&state=true&full=false");
      fetch(this.baseURL + "alarm/partitions/" + uuidPartition + "?alarm=false&zones=false&control=false&attributes=false&config=false&state=true&full=false",myInitGet)
      .then(fstatus)
      .then(fjson)
      .then(function returnIntStatus(jsonResponse){
        console.log("Response of getSecurityStatus :", uuidPartition);
        let armMode = jsonResponse.state.armMode;
        let tripped = jsonResponse.state.tripped;
        console.log("armMode :",armMode);
        console.log("tripped :",tripped);
        // console.log("Test force error on connection");
        // var err = new Error("Unauthorized");
        // reject(err);
        if(tripped == "true")
          resolve(4);
        if(armMode == "HOME")
          resolve(0); // STAY_ARM
        if(armMode == "AWAY")
          resolve(1); // AWAY_ARM
        if(armMode == "DISARMED")
          resolve(3); // DISARMED
        reject("Bad return > no status find for this partition.");
      })
      .catch(function manageError(error) {
        console.log('Error occurred!', error);// TODO ADD gestion Error
        reject(error);
      });// end fetch chaining
    }.bind(this)); // end promise
  }// End getSecurityStatus

  putAttributesValueRequest(uuid,valueBool){
    return new Promise(function(resolve, reject){
      this.debug && this.log("Methode putAttributesValueRequest() uuid :",uuid);
      var myInitPut = {
        method: 'PUT',
        body: valueBool
      };
      this.debug && this.log("myInitPut:",myInitPut);
      this.debug && this.log("URL:",this.baseURL + 'attributes/' + uuid + '/value');
      fetch(this.baseURL + 'attributes/' + uuid + '/value',myInitPut)
      .then(fstatus)
      .then(function giveResponse(response){
        //console.log("Response of put : ",response)
        resolve(null);
      })
      .catch(function manageError(error) {
        console.log('Error occurred!', error);// TODO ADD gestion Error
        reject(error);
      });// end fetch chaining
    }.bind(this));// End Promise
  }// end setAttributesValueRequest
} // End class


/* Functions used with fetch. f____ */
function fstatus(response){
  return new Promise(function(resolve,reject){
    console.log("In fstatus", response.status);
    // Check the status
    if (response.status >= 200 && response.status < 300) {
      // Go to the next point
      resolve(response);
    } else {
      console.log("Error on fstatus.", response.statusText);
      reject(new Error(response.statusText));
    }
  });// end promise
}//end function fstatus

function fjson(response){
  return new Promise(function(resolve,reject){
    //console.log("In fjson");
    resolve(response.json());
  });//end Promise
}//end function fjson

function fgetNonce(jsonResponse){
  return new Promise(function(resolve,reject){
    //console.log("Init jsonResponse :",jsonResponse);
    //console.log("Nonce : ",jsonResponse.nonce);
    resolve(jsonResponse.nonce);
  });//end promise
}// end function fgetNonce

module.exports = Zipabox
