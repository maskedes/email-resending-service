# envoy-go — Go SDK

Official E-NVOY SDK for Go.

## Install

Not yet tagged on the Go module proxy — use it from this repository via a
`replace` directive, or once tagged:

```bash
go get github.com/maskedes/envoy-go
```

```go
// go.mod (local development against this repo)
replace github.com/maskedes/envoy-go => ../email-resending-service/sdk/go
```

## Quick start

```go
package main

import (
	"fmt"
	"log"

	envoy "github.com/maskedes/envoy-go"
)

func main() {
	client := envoy.New("fms_YOUR_API_KEY")

	result, err := client.Emails.Send(&envoy.SendRequest{
		To:      "user@example.com",
		From:    "hello@yourdomain.com",
		Subject: "Welcome!",
		HTML:    "<h1>Hello!</h1><p>Your account is ready.</p>",
	})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Queued:", result.ID)
}
```

## Custom host

```go
client := envoy.NewWithHost("fms_YOUR_API_KEY", "http://78.154.103.19:12083")
```

`New` uses the `ENVOY_HOST` environment variable when set, otherwise the hosted
E-NVOY API.

## Tags

```go
result, err := client.Emails.Send(&envoy.SendRequest{
	To:      "user@example.com",
	Subject: "Report",
	HTML:    "<p>Weekly report</p>",
	Tags: map[string]string{
		"campaign": "weekly",
	},
})
```

## Errors

Non-2xx responses return `*envoy.Error` with `StatusCode`, `Type` and `Message`.
