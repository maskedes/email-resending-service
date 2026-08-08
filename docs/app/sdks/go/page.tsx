import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Go SDK — E-NVOY Docs' };

export default function SDKGo() {
  return (
    <div className="prose">
      <h1>Go SDK</h1>
      <p>Send emails from Go applications.</p>

      <h2>Install</h2>
      <pre><code>{`go get github.com/maskedes/envoy-go`}</code></pre>

      <h2>Quick Start</h2>
      <pre><code>{`package main

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
}`}</code></pre>

      <h2>With Custom Host</h2>
      <pre><code>{`client := envoy.NewWithHost("fms_YOUR_API_KEY", "https://your-server.com")`}</code></pre>

      <h2>Tags</h2>
      <pre><code>{`result, err := client.Emails.Send(&envoy.SendRequest{
	To:      "user@example.com",
	Subject: "Report",
	HTML:    "<p>Weekly report</p>",
	Tags: map[string]string{
		"campaign": "weekly",
	},
})`}</code></pre>
    </div>
  );
}
