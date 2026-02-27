# Data Dash
an application for analyzing sales


## google OAuth
google OAuth
prod
Authorized js origins
https://data.tannerr.com
authorized redirect URIs
https://data.tannerr.com/api/login

dev
authorized js origins
http://localhost:8080
authorized redirect URIs
https://localhost:8080/api/login


## Build & Deploy Commands

Local:
```bash
docker build . -t tannerrhub/data-app:latest
```

```bash
docker push tannerrhub/data-app:latest
```

VPS:
```bash
docker pull tannerrhub/data-app
```

```bash
docker stop data-app
```

```bash
docker run -d --rm --name data-app -e ENV=production -e HTTPS=true -p 8080:8080 --mount type=volume,src=integration-data,target=/app/volume tannerrhub/data-app:latest
```

Enter container
```bash
docker exec -it my_container /bin/bash
```


### Deploy Script Command

```bash
chmod +x deploy.sh
```

```bash
VERSION="202509270741" ./deploy.sh
```
### For production, set the environment variable:
export JWT_SECRET="EXAMPLE4e5f6789012345678901234567890abcdef1234567890abcdef123456"
For development, just run the app - it will create and reuse .jwt_secret
