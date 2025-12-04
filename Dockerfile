FROM golang:latest AS builder

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN CGO_ENABLED=0 go build -o myapp .

FROM alpine:latest

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY --from=builder /app/myapp .

COPY templates/ templates/

COPY public/ public/

EXPOSE 8080

CMD ["./myapp"]

