'use strict';
const AWS = require("aws-sdk");

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
module.exports.webSocketHandler = async (event, context) => {
  console.log(JSON.stringify(event, null, 2));
  /*
    Testing from application using web socket
    Test with local command like,
    sls invoke -f databaseStreamHandler -d '{"requestContext": {"stage": "dev", "domainName": "us2q8s4g99.execute-api.us-east-1.amazonaws.com", "connectionId": "VDbIBcbCoAMAcqw="}, "body": "{\"randNum\":123456789,\"msg\":\"test from local invoke\"}"}'
  */
  const body = JSON.parse(event.body);
  const randNum = body.randNum;
  const msg = body.msg;
  
  let connectionId = event.requestContext.connectionId;
  let ipAddress = event.requestContext.identity.sourceIp;
  const endpoint = event.requestContext.domainName + "/" + event.requestContext.stage;
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
      apiVersion: "2018-11-29",
      endpoint: endpoint
    });
  const params = {
      ConnectionId: connectionId,
      Data: JSON.stringify({connectionID: connectionId, ipAddress: ipAddress, randNum: randNum, msg: msg}),
    };
  return apigwManagementApi.postToConnection(params).promise();

};
