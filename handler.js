'use strict';
const AWS = require("aws-sdk");
require("aws-sdk/clients/apigatewaymanagementapi");

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

module.exports.databaseStreamHandler = async (event, context) => {
  console.log(JSON.stringify(event, null, 2));
  /*
    Testing from application using web socket
  */
  const body = JSON.parse(event.body);
  const randNum = body.randNum;
  const msg = body.msg;
  
  let connectionId = event.requestContext.connectionId;
  const endpoint = event.requestContext.domainName + "/" + event.requestContext.stage;
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

