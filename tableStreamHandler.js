/*
  CONNECTED Collection example
  {
    "ApproximateCreationDateTime": 1604897830,
    "Keys": {
        "collection": {
            "S": "CONNECTED"
        },
        "subCollection": {
            "S": "CONNECTED#USER#108.162.151.86"
        }
    },
    "NewImage": {
        "data": {
            "M": {
                "connectedAt": {
                    "N": "1604897827792"
                },
                "ipAddress": {
                    "S": "108.162.151.86"
                },
                "connectionId": {
                    "S": "VuTVmcGroAMCElQ="
                },
                "userName": {
                    "S": "yoyo"
                }
            }
        },
        "collection": {
            "S": "CONNECTED"
        },
        "subCollection": {
            "S": "CONNECTED#USER#108.162.151.86"
        }
    },
    "SequenceNumber": "23196300000000002760543310",
    "SizeBytes": 215,
    "StreamViewType": "NEW_IMAGE"
}

  MESSAGE Collection example:
  {
    "ApproximateCreationDateTime": 1604897944,
    "Keys": {
        "collection": {
            "S": "MESSAGES"
        },
        "subCollection": {
            "S": "MESSAGES#ID#66ca7007-5df0-4f85-8e17-622601647cd2"
        }
    },
    "NewImage": {
        "data": {
            "M": {
                "created": {
                    "N": "1604897943928"
                },
                "ipAddress": {
                    "S": "108.162.151.86"
                },
                "id": {
                    "S": "66ca7007-5df0-4f85-8e17-622601647cd2"
                },
                "userName": {
                    "S": "yoyo"
                },
                "content": {
                    "S": "testing?"
                }
            }
        },
        "collection": {
            "S": "MESSAGES"
        },
        "subCollection": {
            "S": "MESSAGES#ID#66ca7007-5df0-4f85-8e17-622601647cd2"
        }
    },
    "SequenceNumber": "23196400000000002760578634",
    "SizeBytes": 273,
    "StreamViewType": "NEW_IMAGE"
}
*/

const AWS = require("aws-sdk");
require("aws-sdk/clients/apigatewaymanagementapi");
var docClient = new AWS.DynamoDB.DocumentClient();
var merge = require('lodash.merge');

/******************************************************************
 * Database Stream handlers
******************************************************************/
module.exports.chatTableStreamHandler = async (event, context, callback) => {

  let allListenedData = {};
  event.Records.forEach(function(record) {
    console.log(record.eventID);
    console.log(record.eventName);
    console.log('DynamoDB Record: %j', record.dynamodb);
    // Handle MESSAGES collection only
    if(record.eventName === "INSERT" && record.dynamodb.StreamViewType === "NEW_IMAGE" && record.dynamodb.Keys['collection']['S'] === 'MESSAGES') {
      
      // Collect data
      allListenedData = {
        "created": record.dynamodb.NewImage['data']['M']['created']['N'],
        "ipAddress": record.dynamodb.NewImage['data']['M']['ipAddress']['S'],
        "id": record.dynamodb.NewImage['data']['M']['id']['S'],
        "userName": record.dynamodb.NewImage['data']['M']['userName']['S'],
        "content": record.dynamodb.NewImage['data']['M']['content']['S'],
      };
      
    }
  });

  console.log('Picked Data: ', allListenedData);

  // Get connected users
  var lambda = new AWS.Lambda({
    region: process.env.REGION_NAME
  });

  const lambdaParams = {
    FunctionName: process.env.SERVICE_NAME + '-' + process.env.STAGE_NAME + '-getConnected'
  };

  try {
    const res = await lambda.invoke(lambdaParams).promise();
    /*
      Example res:
      {
          "StatusCode": 200,
          "ExecutedVersion": "$LATEST",
          "Payload": "\"{\\\"statusCode\\\":200,\\\"message\\\":\\\"Scan completed\\\",\\\"body\\\":[{\\\"collection\\\":\\\"CONNECTED\\\",\\\"data\\\":{\\\"ipAddress\\\":\\\"108.162.151.86\\\",\\\"connectionId\\\":\\\"VuanDeEfIAMCKaw=\\\",\\\"userName\\\":\\\"yoyo\\\",\\\"connectedAt\\\":1604900806678},\\\"subCollection\\\":\\\"CONNECTED#USER#108.162.151.86\\\"}]}\""
      }
    */
    console.log('Get all connected user Lambda called: ', JSON.stringify(res, null, 2));
    console.log('Res type is ' + typeof res.Payload);

    if (res.StatusCode === 200) {
      let parsedData = JSON.parse(res.Payload);
      let parsedAgainData = JSON.parse(parsedData);
      let connectedUserList = parsedAgainData.body ? [...parsedAgainData.body] : [];
      console.log('Connected List: ', connectedUserList);
      // Example of each user data:
      // {"collection":"CONNECTED","data":{"ipAddress":"108.162.151.86","connectionId":"VuTVmcGroAMCElQ=","userName":"yoyo","connectedAt":1604897827792},"subCollection":"CONNECTED#USER#108.162.151.86"}

      // create task
      let taskContainer = [];
      function tempLambdaFunction(targetUserData) {
        return new Promise(function async (resolve, reject){
 
          let payload = {
            "requestContext": {
              "stage": "dev", 
              "domainName": "us2q8s4g99.execute-api.us-east-1.amazonaws.com",  // Use Websocket URL
              "connectionId": targetUserData['connectionId']
            },
            "body": {...allListenedData}
          }

          let lambda2Params = {
            FunctionName: process.env.SERVICE_NAME + '-' + process.env.STAGE_NAME + '-webSocketMessageHandler',
            Payload: JSON.stringify(payload, null, 2)
          }
          console.log('Executing for target: ', lambda2Params);
          lambda.invoke(lambda2Params).promise().then(() => {
            resolve();
          }).catch((e) => {
            reject(e);
          });
        });
      }

      for(let i = 0; i < connectedUserList.length; i++) {
        const targetUserData = connectedUserList[i]['data'];
        taskContainer.push(tempLambdaFunction(targetUserData));
      }

      Promise.all(taskContainer).then(() => {
        callback(null, 'Done!');
      }).catch(e => {
        console.log('Error Promising ALL' + JSON.stringify(e));
        callback(null, 'Error!');
      })
    }
  } catch(e) {
    console.log('Error Calling Lambda: ', JSON.stringify(e, null, 2));
    callback(null, 'Error!');
  }

};