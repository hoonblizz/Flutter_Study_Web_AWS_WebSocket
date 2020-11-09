'use strict';
const AWS = require("aws-sdk");
require("aws-sdk/clients/apigatewaymanagementapi");
var util = require('util')

/******************************************************************
 * Web socket handlers
******************************************************************/
const success = {
  statusCode: 200
};

module.exports.connectionHandler = async (event, context) => { 
  
  if (event.requestContext.eventType === 'CONNECT') {
    console.log(`[ConnectionHandler] Connected: ${JSON.stringify(event, null, 2)}`);
    return success;
  }
  else if (event.requestContext.eventType === 'DISCONNECT') {
    console.log(`[ConnectionHandler] Disconnected: ${JSON.stringify(event, null, 2)}`);

    // Grab the ip and call deletion lambda function
    const ipAddress = event.requestContext.identity.sourceIp;
    const connectionId = event.requestContext.connectionId;

    var lambda = new AWS.Lambda({
      region: process.env.REGION_NAME
    });

    var params = {
      FunctionName: process.env.SERVICE_NAME + '-' + process.env.STAGE_NAME + '-deleteConnected',
      Payload: JSON.stringify({ipAddress: ipAddress})
    }

    try {
      const data = lambda.invoke(params).promise();
      console.log('Deletion Lambda called: ', JSON.stringify(data, null, 2));
    } catch(e) {
      console.log('Error Calling Lambda: ', JSON.stringify(e, null, 2));
    }
    
    return success;
  }

};

module.exports.defaultHandler = async (event, context) => {
  let connectionId = event.requestContext.connectionId;
  const endpoint = event.requestContext.domainName + "/" + event.requestContext.stage;
  console.log('[defaultHandler] endpoint is: ' + endpoint);
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
      apiVersion: "2018-11-29",
      endpoint: endpoint
  });
  const params = {
      ConnectionId: connectionId,
      Data: 'Seems like wrong endpoint'
  };
  return apigwManagementApi.postToConnection(params).promise();
};

// Realtime Update messages to a single target user
// This should be called from dynamoDB stream lambda function (See tableStreamHandler)
module.exports.webSocketMessageHandler = async (event, context) => {
  console.log(JSON.stringify(event, null, 2));
  console.log('Type is ' + typeof event);
  
   /*
    Testing from application using web socket
    Test with local command like,
    sls invoke -f webSocketMessageHandler -d '{"requestContext": {"stage": "dev", "domainName": "0nigzvtewe.execute-api.us-east-1.amazonaws.com", "connectionId": "Vum_JdH7oAMCKhw="}, "body": {}'
  */
  let parsedEvent = event; //JSON.parse(event);
  let parsedBody = event.body;
  
  let connectionId = parsedEvent.requestContext.connectionId;
  const endpoint = parsedEvent.requestContext.domainName + "/" + parsedEvent.requestContext.stage;
  
  console.log(`Connection Id: ${connectionId} and end point: ${endpoint}`);
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
      apiVersion: "2018-11-29",
      endpoint: endpoint
    });
  const params = {
      ConnectionId: connectionId,
      Data: JSON.stringify({fromLogin: false, connectionID: connectionId, messageData: parsedBody}),
    };
  return apigwManagementApi.postToConnection(params).promise();

};

/// Process login then return connection info (connection id, ip address, etc)
module.exports.webSocketLoginHandler = async (event, context) => {
  console.log(JSON.stringify(event, null, 2));

  // Collect connection data
  let connectionId = event.requestContext.connectionId;
  let connectedAt = event.requestContext.connectedAt;
  let ipAddress = event.requestContext.identity.sourceIp;

  const body = JSON.parse(event.body);
  const userName = body.userName;

  // Proceed with logging in
  var lambda = new AWS.Lambda({
    region: process.env.REGION_NAME
  });

  const lambdaParams = {
    FunctionName: process.env.SERVICE_NAME + '-' + process.env.STAGE_NAME + '-createConnectedUser',
    Payload: JSON.stringify({
      connectionId: connectionId, 
      ipAddress: ipAddress, 
      connectedAt: connectedAt, 
      userName: userName
    })
  }

  try {
    const data = await lambda.invoke(lambdaParams).promise();
    console.log('Create connectedUser Lambda called: ', JSON.stringify(data, null, 2));
  } catch(e) {
    console.log('Error Calling Lambda: ', JSON.stringify(e, null, 2));
  }

  
  const endpoint = event.requestContext.domainName + "/" + event.requestContext.stage;
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
      apiVersion: "2018-11-29",
      endpoint: endpoint
    });
  const params = {
      ConnectionId: connectionId,
      Data: JSON.stringify({fromLogin: true, connectionID: connectionId, connectedAt: connectedAt, ipAddress: ipAddress, userName: userName}),
    };
  return apigwManagementApi.postToConnection(params).promise();


};

// To test, 
// sls invoke -f webSocketTestHandler -d '{"requestContext": {"stage": "dev", "domainName": "us2q8s4g99.execute-api.us-east-1.amazonaws.com", "connectionId": "VwJUucxDoAMCJwA="}, "body": "{\"action\":\"chatTest\",\"randNum\":123456789,\"msg\":\"test from local invoke\"}"}'
module.exports.webSocketTestHandler = async (event, context) => {

  console.log(JSON.stringify(event, null, 2));
  
  const body = JSON.parse(event.body);
  const randNum = body.randNum;
  const msg = body.msg;
  
  let connectionId = event.requestContext.connectionId;
  const endpoint = event.requestContext.domainName + "/" + event.requestContext.stage; //util.format(util.format('https://%s/%s', event.requestContext.domainName, event.requestContext.stage)); 
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
      apiVersion: "2018-11-29",
      endpoint: endpoint
    });
  const params = {
      ConnectionId: connectionId,
      Data: JSON.stringify({connectionID: connectionId, randNum: randNum, msg: msg}),
    };
  return apigwManagementApi.postToConnection(params).promise();

};
