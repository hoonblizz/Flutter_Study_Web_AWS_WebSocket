# Flutter + AWS Web Socket


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