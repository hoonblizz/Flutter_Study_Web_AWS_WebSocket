'use strict';
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require('uuid');
require("aws-sdk/clients/apigatewaymanagementapi");
const dynamodb = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();
const tableName = "flutterSlsTable";

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

  // Testing with local command using like, 
  // sls invoke -f databaseStreamHandler -d '{"randNum": 12345, "msg": "msg from invoke", "connectionId": "U9JwfeC1IAMCFIQ=", "domainName": "us2q8s4g99.execute-api.us-east-1.amazonaws.com", "stage": "dev"}'
  const randNum = event.randNum;
  const msg = event.msg;
  
  let connectionId = event.connectionId;
  const endpoint = event.domainName + "/" + event.stage;
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
      apiVersion: "2018-11-29",
      endpoint: endpoint
    });
  const params = {
      ConnectionId: connectionId,
      Data: JSON.stringify({connectionID: connectionId, randNum: randNum, msg: msg}),
    };
  return apigwManagementApi.postToConnection(params).promise();

  // Testing from application using web socket
  
  // const body = JSON.parse(event.body);
  // const randNum = body.data.body.randNum;
  // const msg = body.data.body.msg;
  
  // let connectionId = event.requestContext.connectionId;
  // const endpoint = event.requestContext.domainName + "/" + event.requestContext.stage;
  // const apigwManagementApi = new AWS.ApiGatewayManagementApi({
  //     apiVersion: "2018-11-29",
  //     endpoint: endpoint
  //   });
  // const params = {
  //     ConnectionId: connectionId,
  //     Data: JSON.stringify({connectionID: connectionId, randNum: randNum, msg: msg}),
  //   };
  // return apigwManagementApi.postToConnection(params).promise();
};

