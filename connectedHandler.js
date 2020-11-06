'use strict';
const AWS = require("aws-sdk");
require("aws-sdk/clients/apigatewaymanagementapi");
var docClient = new AWS.DynamoDB.DocumentClient();

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
/// sls invoke -f createConnectedUser -d '{"socketData": {"connectionId": "abcd12345", "connectedAt": 12345678}, "userData": {"userName": "testerUser"}}'
module.exports.createConnectedUser = async (event, context) => {
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
      body: data,
    };
    console.log("Added item:", JSON.stringify(data, null, 2));
  } catch(err) {
    response = {
      statusCode: 400,
      body: err,
    };
    console.error("Unable to create item. Error JSON:", JSON.stringify(err, null, 2));
  }

  //callback(null, response);
  // Stringify 를 안해주면, 
  // { "result": {statusCode=200, body="{}"} } 이런식으로 결과가 나온다.
  return JSON.stringify(response);
}

/// Get ALL connected users
module.exports.getConnected = async (event, context, callback) => {

  let response = {};

  console.log('Received parameter in event: ', JSON.stringify(event, null, 2));

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
      body: err,
    };
    console.error("Unable to get item. Error JSON:", JSON.stringify(err, null, 2));
  }

  //callback(null, response);
  return JSON.stringify(response);
};

/// Get a single user (check if exists)
module.exports.getConnectedUser = async (event, context, callback) => {

  let response = {};

  console.log('Received parameter in event: ', JSON.stringify(event, null, 2));
  let {userName} = event;

  var params = {
    TableName: process.env.TABLE_NAME,
    FilterExpression: "#collectionName = :cname AND (attribute_exists(#data.#userName) AND #data.#userName = :userName)",
    ExpressionAttributeNames:{
      "#collectionName": "collection",
      "#data": "data",
      "#userName": "userName"
    },
    ExpressionAttributeValues: {
      ":cname": "CONNECTED",
      ":userName": userName
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
      body: err,
    };
    console.error("Unable to get item. Error JSON:", JSON.stringify(err, null, 2));
  }

  //callback(null, response);
  return JSON.stringify(response);
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
      body: err,
    };
    console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
  }

  //callback(null, response);
  return JSON.stringify(response);
};

module.exports.deleteConnected = async (event, context, callback) => {
  let response = {};

  console.log('Received parameter in event: ', JSON.stringify(event, null, 2));
  let {userName} = event;

  var params = {
    TableName:table,
    Key:{
      "collection": "CONNECTED",
      "subCollection": "CONNECTED#USER#" + userName,
    }
  };

  try {
    const data = await docClient.delete(params).promise();
    response = {
      statusCode: 200,
      message: "Delete completed",
      body: data,
    };
    console.log("Delete succeeded:", JSON.stringify(data, null, 2));
  } catch(err) {
    response = {
      statusCode: 400,
      message: "Delete error",
      body: err,
    };
    console.error("Unable to Delete item. Error JSON:", JSON.stringify(err, null, 2));
  }

  return response;
};