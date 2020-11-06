# Flutter + AWS Web Socket

## Chat Process
API Gateway + Lambda 로 메세지를 보내면 <br>
DynamoDB 에 메세지가 들어가면서 곧바로 Stream Lambda 가 발동되고 <br>
Stream 안에서 각 CONNECTED collection 안의 유저들에게 <br>
현재의 모든 MESSAGES collection 내용을 업데이트 해준다. <br>
업데이트 방법은 webSocketHandler 에게 하나하나 전달해주면 된다. <br>

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
- 