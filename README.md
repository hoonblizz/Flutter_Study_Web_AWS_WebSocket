# Flutter + AWS Web Socket

## Chat Process
API Gateway + Lambda 로 메세지를 보내면 <br>
DynamoDB 에 메세지가 들어가면서 곧바로 Stream Lambda 가 발동되고 <br>
Stream 안에서 각 CONNECTED collection 안의 유저들에게 <br>
현재의 모든 MESSAGES collection 내용을 업데이트 해준다. <br>
업데이트 방법은 webSocketHandler 에게 하나하나 전달해주면 된다. <br>

## Web socket
- Disconnection 은 다른 페이지로 넘어가거나 브라우저를 종료해도 일어난다 <br>

## request, response template 
Number 가 들어갈때랑 String 이 들어갈때랑 다른점을 모르면 문제가 생길수 있다. <br>
간단히 말해서, <br>
```yml
request:
  template:
    application/json: >
      #set($inputRoot = $input.path('$'))
      {
        "connectionId": "$inputRoot.socketData.connectionId",
        "connectedAt": $inputRoot.socketData.connectedAt,
        "userName": "$inputRoot.userData.userName"
      }
response:
  headers:
    Access-Control-Allow-Origin: "'*'"
    Content-Type: "'application/json'"
  template: ${file(templates/responseTemplateDefault.txt)}
```
- String 이 들어갈때는 "" 를 꼭 써주고, Number 가 들어갈때는 "" 를 써주지 않는다. <br>
- Request, Response template 사용시, 꼭 `integration: lambda` 이걸 선언해준다. (아니면 lambda-proxy 를 선언하게됨) <br>


## Lambda IAM and resource access
[여기 참조][https://docs.aws.amazon.com/ko_kr/lambda/latest/dg/lambda-api-permissions-ref.html]

## Global Secondary Indexes
```yaml
GlobalSecondaryIndexes:
  - IndexName: gsi-timestamp
    KeySchema:
    - AttributeName: subCollection 
      KeyType: HASH
    - AttributeName: timestamp 
      KeyType: RANGE
    Projection:
      NonKeyAttributes:
      - collection
      ProjectionType: INCLUDE
    ProvisionedThroughput:
      ReadCapacityUnits: 5
      WriteCapacityUnits: 5
```
Index name 은 테이블 이름과 같은것. <br>
KeySchema 에서는 GSI 테이블에서 사용될 Attribute 를 고르는것 <br>
예를들어, subCollection 을 파티션키로 넣고, timestamp 를 sort 키로 넣었다. <br>

[AWS DOC][https://docs.aws.amazon.com/ko_kr/amazondynamodb/latest/developerguide/GSI.html]

## Lambda to Web socket handler
Lambda 에서 web socket 에 연결된 lambda 를 불러서 웹 소켓을 작동 시키려면 <br>
```yml
- Effect: Allow
  Action:
    - "execute-api:ManageConnections"
  Resource:
    - "arn:aws:execute-api:*:*:**/@connections/*"
```
이 퍼미션이 꼭 필요하다.

## Errors:

### Unexpected token o in JSON at position 1
Single, Double quote 확인한다. <br>