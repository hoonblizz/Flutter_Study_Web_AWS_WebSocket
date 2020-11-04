/*
  DynamoDB one to many relationship example:
  https://www.alexdebrie.com/posts/dynamodb-one-to-many/#composite-primary-key--the-query-api-action

  DynamoDB GET / POST Tutorial: 
  https://medium.com/better-programming/store-fetch-from-dynamodb-with-aws-lambda-342d1785a5d0
  https://docs.aws.amazon.com/ko_kr/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.03.html#GettingStarted.NodeJs.03.03

  Serverless "resource" example:
  https://gist.github.com/DavidWells/c7df5df9c3e5039ee8c7c888aece2dd5

  DynamoDB one to many relationship: <-- IMPORTANT!
  https://stackoverflow.com/questions/55152296/how-to-model-one-to-one-one-to-many-and-many-to-many-relationships-in-dynamodb 

  Condition Expressions:
  https://docs.aws.amazon.com/ko_kr/amazondynamodb/latest/developerguide/Expressions.OperatorsAndFunctions.html

  Expression Attribute Names
  https://docs.aws.amazon.com/ko_kr/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeNames.html

*/
'use strict';
const AWS = require("aws-sdk");
require("aws-sdk/clients/apigatewaymanagementapi");
var docClient = new AWS.DynamoDB.DocumentClient();

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

module.exports.databaseStreamHandler = async (event, context) => {
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

/******************************************************************
 * CONNECTED Colleciton handlers
******************************************************************/
/// Create "CONNECTED" collection. Run by Admin only ONCE!
module.exports.createConnected = async (event, context, callback) => {
  // https://docs.aws.amazon.com/ko_kr/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.03.html#GettingStarted.NodeJs.03.04

  let response = {};
  var timeNow = Date.now(); // in miliseconds

  var params = {
    TableName: process.env.TABLE_NAME,
    Item: {
      "collection": "CONNECTED",  
      "subCollection": "METADATA#CONNECTED",
      "data": {
        "created": timeNow,
        "totalConnected": 0
      }
    }
  }

  try {
    const data = await docClient.put(params).promise();
    response = {
      statusCode: 200,
      body: JSON.stringify(JSON.stringify(data, null, 2)),
    };
    console.log("Added item:", JSON.stringify(data, null, 2));
  } catch(err) {
    response = {
      statusCode: 400,
      body: JSON.stringify(err, null, 2),
    };
    console.error("Unable to create item. Error JSON:", JSON.stringify(err, null, 2));
  }

  callback(null, response);
};

/// Create User in CONNECTED collection.
/// sls invoke -f createConnectedUser -d '{"connectionId": "abcd12345", "connectedAt": 12345678, "userName": "testerUser"}'
module.exports.createConnectedUser = async (event, context, callback) => {
  let response = {};
  console.log('Received event: ', JSON.stringify(event, null, 2));
  
  // destruct
  const {connectionId, connectedAt, userName} = event;

  var params = {
    TableName: process.env.TABLE_NAME,
    Item: {
      "collection": "CONNECTED",  
      "subCollection": "CONNECTED#USER#" + userName,
      "data": {
        "connectionId": connectionId,
        "connectedAt": connectedAt,
        "userName": userName
      }
    }
  }

  try {
    const data = await docClient.put(params).promise();
    response = {
      statusCode: 200,
      body: JSON.stringify(JSON.stringify(data, null, 2)),
    };
    console.log("Added item:", JSON.stringify(data, null, 2));
  } catch(err) {
    response = {
      statusCode: 400,
      body: JSON.stringify(err, null, 2),
    };
    console.error("Unable to create item. Error JSON:", JSON.stringify(err, null, 2));
  }

  callback(null, response);
}

/// Get all connected users
module.exports.getConnected = async (event, context, callback) => {
  let response = {};
  // With in "CONNECTED" collection, 
  // check if key "userName" exists and it's not null
  // 식 속성 이름 부르는 방법: Nested 같은 경우엔 하나씩 ExpressionAttributeNames 에 불러준 다음 Dot (.) 으로 써준다.
  var params = {
    TableName: process.env.TABLE_NAME,
    FilterExpression: "#collectionName = :cname AND (attribute_exists(#data.#userName) AND NOT #data.#userName = :null)",
    ExpressionAttributeNames:{
      "#collectionName": "collection",
      "#data": "data",
      "#userName": "userName"
    },
    ExpressionAttributeValues: {
      ":cname": "CONNECTED",
      ":null": null
    }
  }

  try {
    const data = await docClient.scan(params).promise();
    // data.Items 라는 Array 로 나온다.
    // Scan 은 최대 1MB 까지만 가져오므로, 1MB 가 넘을때를 대비한 코드도 필요하지만, 여기서는 넘어가자. 
    // 여기서 더 찾아볼수 있다.
    // https://docs.aws.amazon.com/ko_kr/amazondynamodb/latest/developerguide/GettingStarted.NodeJs.04.html
    response = {
      statusCode: 200,
      message: "Scan completed",
      body: data.Items,
    };
    console.log('Printing all scanned items....');
    data.Items.forEach((el) => {
      JSON.stringify(el, null, 2)
    });
  } catch(err) {
    response = {
      statusCode: 400,
      message: "Scan error",
      body: JSON.stringify(err, null, 2),
    };
    console.error("Unable to get item. Error JSON:", JSON.stringify(err, null, 2));
  }

  callback(null, response);
};

/// Add Connected user
/// To test, make sure to run createConnectedUser then run,
/// sls invoke -f updateConnected -d '{"connectionId": "11223344abc", "connectedAt": 12345678, "userName": "testerUser"}'
/// instead of update, put also works if Partition key and Sort key is marching.
module.exports.updateConnected = async (event, context, callback) => {
  let response = {};
  console.log('Received event: ', JSON.stringify(event, null, 2));
  
  // destruct
  const {connectionId, connectedAt, userName} = event;

  let updateExpressionString = 
    "set "+
    "#data.#userName = :userName, " +
    "#data.#connectionId = :connectionId, " +
    "#data.#connectedAt = :connectedAt";

  var params = {
    TableName: process.env.TABLE_NAME,
    Key:{
      "collection": "CONNECTED",
      "subCollection": "CONNECTED#USER#" + userName,
    },
    UpdateExpression: updateExpressionString,
    ExpressionAttributeNames:{
      "#data": "data",
      "#userName": "userName",
      "#connectionId": "connectionId",
      "#connectedAt": "connectedAt"
    },
    ExpressionAttributeValues:{
      ":userName": userName,
      ":connectionId": connectionId,
      ":connectedAt": connectedAt ? connectedAt : 9999999
    },
    ReturnValues:"UPDATED_NEW"
  };

  try {
    const data = await docClient.update(params).promise();
    response = {
      statusCode: 200,
      message: "Update completed",
      body: data,
    };
    console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2));
  } catch(err) {
    response = {
      statusCode: 400,
      message: "Update error",
      body: JSON.stringify(err, null, 2),
    };
    console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
  }

  callback(null, response);
};

module.exports.deleteConnected = async (event, context, callback) => {};

/******************************************************************
 * MSG Colleciton handlers
******************************************************************/
module.exports.createMessage = async (event, context, callback) => {};
module.exports.getMessage = async (event, context, callback) => {};
module.exports.updateMessage = async (event, context, callback) => {};

/******************************************************************
 * Database Stream handlers
******************************************************************/
module.exports.chatTableStreamHandler = async (event, context, callback) => {};