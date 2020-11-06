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

  Schema Validator Example:
  https://www.fernandomc.com/posts/schema-validation-serverless-framework/
*/
'use strict';
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require('uuid');
require("aws-sdk/clients/apigatewaymanagementapi");
var docClient = new AWS.DynamoDB.DocumentClient();


/******************************************************************
 * MSG Colleciton handlers
******************************************************************/
/// Create MESSAGES collection - run only once
module.exports.createMessage = async (event, context, callback) => {
  let response = {};
  var timeNow = Date.now(); // in miliseconds

  var params = {
    TableName: process.env.TABLE_NAME,
    Item: {
      "collection": "MESSAGES",  
      "subCollection": "METADATA#MESSAGES",
      "data": {
        "created": timeNow,
        "totalMessages": 0
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
/// Create a message that is typed from a user
// sls invoke -f createMessageUser -d '{"ipAddress": "123.456.789", "content": "Hello anybody there?", "userName": "gogogo"}'
module.exports.createMessageUser = async (event, context) => {
  
  let response = {};
  console.log('Received event: ', JSON.stringify(event, null, 2));
  
  // destruct
  const {ipAddress, content, userName} = event;

  // create uuid
  const uuid = uuidv4();

  var params = {
    TableName: process.env.TABLE_NAME,
    Item: {
      "collection": "MESSAGES",  
      "subCollection": "MESSAGES#ID#" + uuid,
      "data": {
        "id": uuid,
        "ipAddress": ipAddress,
        "content": content,
        "userName": userName,
        "created": Date.now()
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

  return JSON.stringify(response);  
}

// This is called only once when user logs in.
module.exports.getMessage = async (event, context) => {
  let response = {};

  console.log('Received parameter in event: ', JSON.stringify(event, null, 2));

  // With in "CONNECTED" collection, 
  // check if key "userName" exists and it's not null
  // 식 속성 이름 부르는 방법: Nested 같은 경우엔 하나씩 ExpressionAttributeNames 에 불러준 다음 Dot (.) 으로 써준다.
  var params = {
    TableName: process.env.TABLE_NAME,
    FilterExpression: "#collectionName = :cname AND (attribute_exists(#data.#ipAddress) AND NOT #data.#ipAddress = :null)",
    ExpressionAttributeNames:{
      "#collectionName": "collection",
      "#data": "data",
      "#ipAddress": "ipAddress"
    },
    ExpressionAttributeValues: {
      ":cname": "MESSAGES",
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

  return JSON.stringify(response);
};
module.exports.updateMessage = async (event, context, callback) => {};
