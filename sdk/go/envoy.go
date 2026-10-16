// Package envoy is the official E-NVOY Go SDK.
//
// It wraps the POST /api/emails/send endpoint and attaches your API key
// (prefixed fms_) as the x-api-key header.
//
//	client := envoy.New("fms_YOUR_API_KEY")
//	result, err := client.Emails.Send(&envoy.SendRequest{
//		From:    "hello@yourdomain.com",
//		To:      "user@example.com",
//		Subject: "Welcome!",
//		HTML:    "<h1>Hello!</h1>",
//	})
//	if err != nil {
//		log.Fatal(err)
//	}
//	fmt.Println("Queued:", result.ID)
package envoy

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// DefaultHost is used when no host is supplied and ENVOY_HOST is unset.
const DefaultHost = "http://78.154.103.19:12083"

func resolveDefaultHost() string {
	if h := strings.TrimSpace(os.Getenv("ENVOY_HOST")); h != "" {
		return h
	}
	return DefaultHost
}

// Client is a single-API-key E-NVOY client.
type Client struct {
	APIKey string
	Host   string
	Emails *EmailsResource

	httpClient *http.Client
}

// New creates a client using the default host (ENVOY_HOST or the hosted API).
func New(apiKey string) *Client {
	return NewWithHost(apiKey, resolveDefaultHost())
}

// NewWithHost creates a client pointed at an explicit host.
func NewWithHost(apiKey, host string) *Client {
	c := &Client{
		APIKey:     apiKey,
		Host:       strings.TrimRight(strings.TrimSpace(host), "/"),
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
	c.Emails = &EmailsResource{client: c}
	return c
}

// Error is returned for any non-2xx API response.
type Error struct {
	StatusCode int
	Type       string
	Message    string
}

func (e *Error) Error() string {
	if e.Type != "" {
		return fmt.Sprintf("envoy: %s (%d): %s", e.Type, e.StatusCode, e.Message)
	}
	return fmt.Sprintf("envoy: (%d): %s", e.StatusCode, e.Message)
}

// SendRequest describes an email to send.
type SendRequest struct {
	// To is a recipient string or a []string of recipients.
	To           interface{}       `json:"to"`
	From         string            `json:"from,omitempty"`
	Subject      string            `json:"subject,omitempty"`
	HTML         string            `json:"html,omitempty"`
	Text         string            `json:"text,omitempty"`
	ReplyTo      string            `json:"reply_to,omitempty"`
	Tags         map[string]string `json:"tags,omitempty"`
	ScheduleInMs int               `json:"scheduleInMs,omitempty"`
}

// SendResult is a queued message.
type SendResult struct {
	ID        string   `json:"id"`
	From      string   `json:"from"`
	To        []string `json:"to"`
	Subject   string   `json:"subject"`
	Status    string   `json:"status"`
	CreatedAt string   `json:"created_at"`
}

// UnmarshalJSON tolerates `to` being either a string or an array.
func (s *SendResult) UnmarshalJSON(data []byte) error {
	var raw struct {
		ID        string          `json:"id"`
		From      string          `json:"from"`
		To        json.RawMessage `json:"to"`
		Subject   string          `json:"subject"`
		Status    string          `json:"status"`
		CreatedAt string          `json:"created_at"`
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	s.ID = raw.ID
	s.From = raw.From
	s.Subject = raw.Subject
	s.Status = raw.Status
	s.CreatedAt = raw.CreatedAt
	s.To = nil
	if len(raw.To) > 0 {
		var many []string
		if err := json.Unmarshal(raw.To, &many); err == nil {
			s.To = many
		} else {
			var one string
			if err := json.Unmarshal(raw.To, &one); err == nil {
				s.To = []string{one}
			}
		}
	}
	return nil
}

// EmailsResource is reachable as client.Emails.
type EmailsResource struct {
	client *Client
}

// Send sends a single email and returns the queued message.
func (r *EmailsResource) Send(req *SendRequest) (*SendResult, error) {
	var out SendResult
	if err := r.client.do(http.MethodPost, "/api/emails/send", req, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (c *Client) do(method, path string, body, out interface{}) error {
	var reader io.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(payload)
	}

	httpReq, err := http.NewRequest(method, c.Host+path, reader)
	if err != nil {
		return err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", c.APIKey)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var parsed struct {
			Error struct {
				Type    string `json:"type"`
				Message string `json:"message"`
			} `json:"error"`
		}
		_ = json.Unmarshal(data, &parsed)
		message := parsed.Error.Message
		if message == "" {
			message = fmt.Sprintf("request failed with status %d", resp.StatusCode)
		}
		return &Error{StatusCode: resp.StatusCode, Type: parsed.Error.Type, Message: message}
	}

	if out != nil && len(data) > 0 {
		return json.Unmarshal(data, out)
	}
	return nil
}
