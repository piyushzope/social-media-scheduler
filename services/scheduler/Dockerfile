FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git ca-certificates

# Copy go mod file
COPY go.mod ./

# Copy source
COPY . .

# Generate go.sum and download dependencies
RUN go mod tidy

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -o /scheduler ./cmd/scheduler

# Final image
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /scheduler .

# Create non-root user
RUN adduser -D -g '' scheduler
USER scheduler

EXPOSE 4001

CMD ["./scheduler"]
