// Smoke test for the E-NVOY Go SDK — sends one real message.
//
// Usage:
//
//	ENVOY_API_KEY=fms_... [ENVOY_HOST=http://...] [TEST_TO=you@example.com] \
//	    go run ./examples
package main

import (
	"fmt"
	"os"

	envoy "github.com/maskedes/envoy-go"
)

func main() {
	apiKey := os.Getenv("ENVOY_API_KEY")
	if apiKey == "" {
		fmt.Fprintln(os.Stderr, "Missing ENVOY_API_KEY.")
		os.Exit(1)
	}

	client := envoy.New(apiKey)

	to := os.Getenv("TEST_TO")
	if to == "" {
		to = "delivered@resend.dev"
	}

	result, err := client.Emails.Send(&envoy.SendRequest{
		From:    os.Getenv("TEST_FROM"),
		To:      to,
		Subject: "E-NVOY Go SDK smoke test",
		HTML:    "<h1>Hello from the Go SDK</h1>",
		Tags:    map[string]string{"source": "sdk-smoke"},
	})
	if err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(2)
	}

	fmt.Println("OK — queued message:", result.ID, result.Status)
}
