This is a Plugin for [Homebridge](https://github.com/nfarina/homebridge) link to the ZipaBox.
It is just published to test on local access to a ZipaBox (Zipato TM) through the API possibilities.

It's based on many different plugin example that you can find by searching "homebridge-plugin" in all Git repository

The approach is to add multiple accessory and get the base information and action through API request.

The plugin will be adapted to a Platform after programming all the accessory separately (see development route below).

The plugin didn't use the [Zipato API Node.js Implementation](https://github.com/espenmjos/zipato) (no success after a few try) like the [homebridge-zipato](https://github.com/lrozema/homebridge-zipato) plugin. The actual plugin is an alternative with direct connection to [Zipato API] (https://my.zipato.com/zipato-web/api/).

I didn't work with javascript since a few years, so please be comprehensive.

## Development route
1. NPM diffusion
    - [x] create structure of package - DONE
    - [x] diffuse, pack and clear the command - DONE
    - [x] install using homebridge-Congig UI X from oznu - DONE
    - [x] prepare the test environnement - DONE
    - [x] validate the Readme.md
1. index.js - Accessory - Baseline
    - [x] prepare the structure of index.js for accessory
    - [x] test and validate structure of index.js
    - [x] try to connect with Node.js library for the official Zipato REST API
    - [x] add connection to local API of Zipabox
    - [x] code the simple Switch function for power manager > Version 0.1.x
    - [x] validate code of version 0.1.x
    - [x] Manage missing online
1. index.js - Accessory - Light >> Version 0.2.x
    - [x] Add config for Accessory Type + light (default is switch)
    - [x] Try to transform the switch with a lamp
    - [x] have two accessory connected
    - [x] Add force refresh function
1. index.js - Accessory - Outlet >> Version 0.3.x
    - [x] Transform to just add Characteristic
1. index.js - Accessory - Temperature > Version 0.4.x
    - [x] First Sensor implementation
    - [x] StatusLowBattery
1. index.js - Accessory - Luminance = Light Sensor > Version 0.5.x
    - [x] Add Light Sensor
1. index.js - Accessory - Motion > Version 0.6.x
    - [x] Add Motion Sensor
    - [x] Add reverse parameter
    - [x] Add noStatus parameter
    - [x] Adapt timePolling method to other sensor
1. index.js - Accessory - Contact Sensor > Version 0.7.x
    - [X] Add Contact sensor
1. index.js - Accessory - Window > Version 0.8.x
    - [x] Add Window State value > in fact that a sensor with a window logo...
1. index.js - Accessory - Door > Version 0.9.x
    - [x] Add Door based on the window implementation
    - [x] Auto get status if put (like window)
1. index.js - Accessory - Leak > Version 0.10.x
    - [x] Add leak sensor and test with testValue
1. index.js - Accessory - Battery > Version 0.11.x
    - [x] Implemented the battery option
    - [x] Add a double service on one accessory
1. index.js - Accessory - CO Sensor > Version 0.12.x
    - [x] Add CO SENSOR
1. index.js - Accessory - Alarm = Security System > Version 0.13.x
    - [x] Clear the API request to have status > /alarm/partitions/{partition}/attributes
    - [x] Find the API Put to change Alarm state > ???
    - [x] Add the method to secure Init and Login for Alarm
    - [x] Test the connection method without Status check > force with test Value
    - [x] Add Async method to connect on Security system
    - [x] Add resync if missing connection > need test
    - [x] Add Async method to get System status
    - [ ] Add method to set the mode
    - [ ] Add (or no) the SecuritySystemAlarmType
    - [ ] Add security aspect and code
    - [ ] Add possibility to select Night mode in place of Away mode
1. index.js - Adapt to platform ? >> Version 1.x

### Further To-do List

- [x] Add Table to parameter of plugin
- [x] Complete table of parameter
- [x] Add a DEBUG mode
- [x] Check if needed to @ in %40 > no need
- [x] Replace the Request with Fetch (use of Promise)
- [x] Handle reconnection after auto disconnection
- [x] Change the refresh rate for each Accessory
- [x] Explain how to find the UUID
- [x] Change the name of the package
- [ ] Add a fake switch to reboot the box ?
- [ ] Rewrite the parameter order to have something more clear and logic (sub division?)
- [ ] Make a function with reconnect method
- [ ] Bind with a graph viewer (like fakegato)
- [ ] Config to force a device UUID (need ?)
- [x] Status active for sensor ?
- [ ] Check lux scale if correct
- [ ] Defense prog if batteryLevel requested without battery available ?
- [ ] Get name with name device ? > first test no concluded > do we need ?
- [ ] Adapt to non local access > if requested
- [ ] Adapt from accessory to platform > check if need (actual multiple connection)
- [ ] Implementation of Outlet In Use Status > if needed
- [ ] Add Smoke Sensor > if needed
- [ ] Manage possibility to have night mode with an alarm

### Not Implemented Accessory (cause I'm not using them)
- Doorbell
- Dioxide Sensor
- Smoke Sensor

## Config Examples

Simple example
```JSON
"accessories": [
        {
          "accessory": "ZipaAccessory",
          "type": "switch",
          "name": "MyZipaSwitch",
          "USERNAME": "yourUserName",
          "PASSWORD": "yourPassword",
          "server_ip": "192.168.0.0",
          "uuid": "123456789",
          "refresh": 10
        }
]
```
Full example
```JSON
"accessories": [
        {
          "accessory": "ZipaAccessory",
          "type": "switch",
          "name": "MyZipaSwitch",
          "USERNAME": "yourUserName",
          "PASSWORD": "yourPassword",
          "server_ip": "192.168.0.0",
          "uuid": "123456789",
          "uuidB": "001256",
          "manufacturer": "mySwitchManufacturer",
          "model": "mySwitchModel",
          "serial": "mySwitchSerial",
          "debug": true,
          "refresh": 5,
          "noStatus": true,
          "reverse": true,
          "batteryLimit": 15
        }
]
```
## Parameters information
Parameter | Remarks
--------- | -------
accessory | MUST be ZipaAccessory, will say at Homebridge to use the good plugin
type | Select the Accessory Type. switch (default) -others see below-
name | Name of your plugin, will be displayed in HomeKit (muss be unique)
USERNAME | Username use to connect to my.zipato.com
PASSWORD | Password use to connect to my.zipato.com > never publish your Config <br> with this infos
server_ip | Local ip of your Box : format 192.168.0.1 - do not add http or port
uuid | uuid of your devices Switch (see Below)
uuidB | (Optional) Specify a second uuid for a service with two implemented<br>Characteristic - see below -
manufacturer | Manufacturer of your device. No more use than info in HomeKit
model | Model of your device. No more use than info in HomeKit
serial | Serial number of your device. No more use than info in HomeKit
debug | (Optional) If true the console will display tests informations
refresh | (Optional) Time for forced refresh of the status (in seconds)<br>(see Remarks)
batteryLimit | (Optional) Level (in percent 1 to 100) to launch the BatteryLow<br>Status - 0 in default (inactive)
noStatus | (Optional) = true if no Status (is connected) option is available for<br>the device - false in default - see below-
reverse | (Optional) = true if the boolean signal of the sensor need to be<br>reversed - see below
pin | (Optional) : your Pin in Zipato Board to arm or disarm alarm.

## List of implemented function
Device              | type        | Methods
------------------- | ----------- | -------
Switch (default)    | switch      | Get Status - Set On - Set Off - Unavailable
Light Bulb          | light       | Get Status - Set On - Set Off - Unavailable
Outlet              | outlet      | Get Status - Set On - Set Off - Unavailable
Temperature Sensor  | temperature | Get Value - Battery Low Status - Unavailable
Light Sensor        | ambient     | Get Value - Battery Low Status - Unavailable
Motion Sensor       | motion      | Get Value - Battery Low Status - Unavailable
Contact Sensor      | contact     | Get Value - Battery Low Status - Unavailable
Window              | window      | Current Position (0 or 100 %) - Unavailable
Door                | door        | Current Position (0 or 100 %) - Unavailable
Leak Sensor         | leak        | Get Value - Battery Low Status - Unavailable
Battery             | battery     | Battery Level - Status - Unavailable
Carbon Monoxide     | co          | Carbon Detected - Battery Low Status - Unavailable
Security System     | alarm       | Ongoing...

## Remarks

### UUID of Accessory
The UUID need to be the "STATE" UUID of your Zwave Device (the lowest structure level). To be sure you can try with the Zipato API to use this UUID as parameter for attributes request.
The Device UUID is find automatically by the plugin if noStatus is not specified.

### Window and Doors
The plugin only get the status open or closed for door and window. It's like a contact sensor but with an other icon. If the user click on the button in HomeKit, the plugin will force the get position method.

### uuidB - Second Characteristic for implemented Services
For some Accessory, two UUID are necessary to get all the needed Information.

Accessory | uuid          | uuidB
--------- | ----          | -----
Battery   | BatteryLevel  | ChargingStage

### Reverse a value
Some sensor work inverted as HomeKit expect. Example : a motion sensor return true if no motion are detected. If you can't change your sensor return value in his configuration or Zipato configuration, you can add the "reverse = true" parameter to reverse the returned value. Work for all "get" for attributes.
This option if fixed to false by the plugin for an alarm type.

### Device Status Unavailable
In case of unavailable device status you can add the parameter "noStatus": true to ask the plugin to not check the availability of the device. This can happen for wired device to the box (security module).
It can help if your Status UUID have no Parent device with a "status" option.
This option is fixed to true by the plugin for an alarm type.

### Refresh Rate
HomeKit update the status of your device when you reopen the Home APP. If you want to force a refresh you can use the optional parameter "refresh".
You do not need this to keep the connection to the Box. The plugin will reconnect if need after a long time without connection.

### Alarm configuration
To configure an alarm, you must specify the UUID of the partition that you want to follow (not the device or sensor). Also the pin of the user logged in ist necessary to permit access to change the alarm (see next point).

### Pin missing for Alarm
In case of missing PIN parameter for a Alarm accessory, the plugin send a log warning, change the type to "switch" and add an info in the name.
