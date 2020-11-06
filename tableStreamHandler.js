const AWS = require("aws-sdk");
require("aws-sdk/clients/apigatewaymanagementapi");
var docClient = new AWS.DynamoDB.DocumentClient();


/******************************************************************
 * Database Stream handlers
******************************************************************/
module.exports.chatTableStreamHandler = async (event, context, callback) => {};