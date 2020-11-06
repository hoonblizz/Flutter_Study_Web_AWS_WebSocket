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
require("aws-sdk/clients/apigatewaymanagementapi");
var docClient = new AWS.DynamoDB.DocumentClient();


/******************************************************************
 * MSG Colleciton handlers
******************************************************************/
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
module.exports.createMessageUser = async (event, context) => {
  
  let response = {};
  console.log('Received event: ', JSON.stringify(event, null, 2));
  
  // destruct
  const {ipAddress, content, userName} = event;

  var params = {
    TableName: process.env.TABLE_NAME,
    Item: {
      "collection": "MESSAGES",  
      "subCollection": "MESSAGES#USER#" + userName,
      "data": {
        "ipAddress": connectionId,
        "content": connectedAt,
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

  return JSON.stringify(response);  
}
module.exports.getMessage = async (event, context, callback) => {};
module.exports.updateMessage = async (event, context, callback) => {};
