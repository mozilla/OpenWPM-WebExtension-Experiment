# Namespace: `browser.openwpm`

Interface for the OpenWPM WebExtension Experiment API.

## Functions

### `browser.openwpm.start( openwpmSetup )` 

  Start OpenWPM instrumentation. Fires onStarted if successful.
  

**Parameters**

- `openwpmSetup`
  - type: openwpmSetup
  - $ref: 
  - optional: false

### `browser.openwpm.stop( stopReason )` 

  Stop OpenWPM instrumentation.
  

**Parameters**

- `stopReason`
  - type: stopReason
  - $ref: 
  - optional: true

### `browser.openwpm.status(  )` 

  Return current OpenWPM status.
  

**Parameters**

### `browser.openwpm.enableNetworkMonitorForTab( tabId )` 

  Enables network monitoring for a specific tab.
  

**Parameters**

- `tabId`
  - type: tabId
  - $ref: 
  - optional: false

### `browser.openwpm.getHarForTab( tabId )` 

  Returns the current HAR for a specific tab (requires enabled network monitoring for the given tab).
  

**Parameters**

- `tabId`
  - type: tabId
  - $ref: 
  - optional: false

## Events

### `browser.openwpm.onStarted () ` Event

  Fires when the OpenWPM instrumentation has started.
  

**Parameters**

- `openwpmStatus`
  - type: openwpmStatus
  - $ref: 
  - optional: false

### `browser.openwpm.onStopped () ` Event

  Fires when the OpenWPM instrumentation has stopped, either in the event of some errors that forces OpenWPM to stop, or upon `browser.openwpm.stop`.
  

**Parameters**

- `ending`
  - type: ending
  - $ref: 
  - optional: false

## Properties TBD

## Data Types

### [0] NullableString


```json
{
  "id": "NullableString",
  "$schema": "http://json-schema.org/draft-04/schema",
  "oneOf": [
    {
      "type": "null"
    },
    {
      "type": "string"
    }
  ],
  "choices": [
    {
      "type": "null"
    },
    {
      "type": "string"
    }
  ],
  "testcases": [
    null,
    "a string"
  ]
}
```


### [1] NullableInteger


```json
{
  "id": "NullableInteger",
  "$schema": "http://json-schema.org/draft-04/schema",
  "oneOf": [
    {
      "type": "null"
    },
    {
      "type": "integer"
    }
  ],
  "choices": [
    {
      "type": "null"
    },
    {
      "type": "integer"
    }
  ],
  "testcases": [
    null,
    1234567890
  ],
  "failcases": [
    "1234567890",
    []
  ]
}
```


### [2] NullableNumber


```json
{
  "id": "NullableNumber",
  "$schema": "http://json-schema.org/draft-04/schema",
  "oneOf": [
    {
      "type": "null"
    },
    {
      "type": "number"
    }
  ],
  "choices": [
    {
      "type": "null"
    },
    {
      "type": "number"
    }
  ],
  "testcases": [
    null,
    1234567890,
    1234567890.123
  ],
  "failcases": [
    "1234567890",
    "1234567890.123",
    []
  ]
}
```


### [3] openwpmStatusObject


```json
{
  "id": "openwpmStatusObject",
  "$schema": "http://json-schema.org/draft-04/schema",
  "type": "object",
  "additionalProperties": true,
  "properties": {
    "foo": {
      "type": "string"
    }
  },
  "required": [
    "foo"
  ]
}
```


### [4] openwpmSetup


```json
{
  "id": "openwpmSetup",
  "$schema": "http://json-schema.org/draft-04/schema",
  "type": "object",
  "properties": {
    "cookie_instrument": {
      "type": "boolean"
    },
    "js_instrument": {
      "type": "boolean"
    },
    "cp_instrument": {
      "type": "boolean"
    },
    "http_instrument": {
      "type": "boolean"
    },
    "save_javascript": {
      "type": "boolean"
    },
    "save_all_content": {
      "type": "boolean"
    }
  },
  "required": [
    "cookie_instrument",
    "js_instrument",
    "cp_instrument",
    "http_instrument",
    "save_javascript",
    "save_all_content"
  ],
  "additionalProperties": true,
  "testcases": [
    {
      "cookie_instrument": false,
      "js_instrument": false,
      "cp_instrument": false,
      "http_instrument": false,
      "save_javascript": false,
      "save_all_content": false
    }
  ]
}
```


# Namespace: `browser.openwpmDebug`

Interface for Test Utilities

## Functions

### `browser.openwpmDebug.throwAnExceptionSync( message )` 

  Throws an exception from a privileged sync function - for tests making sure that we can catch these in our web extension

**Parameters**

- `message`
  - type: message
  - $ref: 
  - optional: false

### `browser.openwpmDebug.throwAnExceptionAsync( message )` 

  Throws an exception from a privileged async function - for tests making sure that we can catch these in our web extension

**Parameters**

- `message`
  - type: message
  - $ref: 
  - optional: false

### `browser.openwpmDebug.dumpInternalState(  )` 

  Return `api.state`. Used for debugging.
  

**Parameters**

## Events

(None)

## Properties TBD

## Data Types

(None)

