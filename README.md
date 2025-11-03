# QR Code Generator


### Live

Browse: http://194.238.17.79:5175/



### Development mode
```
$ docker compose up vite_svc-dev
```
Browse: http://localhost:5175




### Production mode
```
$ docker compose up vite_svc-prod
```
Browse: http://localhost



### Export
```
$ docker image save qrcode-vite_svc-dev:latest --output ./qrcode-dev.zip
$ docker image save qrcode-vite_svc-prod:latest --output ./qrcode-prod.zip
```

### Import
```
$ docker image load --input ./qrcode-dev.zip
$ docker image load --input ./qrcode-prod.zip
```