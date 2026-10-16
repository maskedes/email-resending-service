import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'SDKs — E-NVOY Docs' };

export default function SDKsOverview() {
  return (
    <div className="prose">
      <h1>E-NVOY SDKs</h1>
      <p>
        Every E-NVOY SDK is built around one unified client, <code>ENovoy</code>.
        It wraps the <code>POST /api/emails/send</code> endpoint, attaches your
        API key automatically as the <code>x-api-key</code> header, and returns a
        normalized response with a message <code>id</code>.
      </p>

      <div className="callout callout-tip">
        <strong>Availability:</strong> the Node, Python and Go SDKs ship in this
        repository under <code>sdk/</code> and are not yet published to npm, PyPI or
        the Go module proxy — install them straight from the repo (each SDK README
        shows how). They all call <code>POST /api/emails/send</code> with your{' '}
        <code>x-api-key</code> and return a <code>200</code> response containing{' '}
        <code>id</code>. Point them at your API host with <code>ENVOY_HOST</code>.
      </div>

      <h2>Server setup for public SDK use</h2>
      <div className="callout callout-tip">
        <strong>Direct access required:</strong> the SDKs call{' '}
        <code>POST /api/emails/send</code> with only your <code>x-api-key</code>.
        If the server sets <code>EDGE_PROXY_SECRET</code>, it answers{' '}
        <code>403 Direct access is not allowed</code>. For public SDK use, leave{' '}
        <code>EDGE_PROXY_SECRET</code> empty on the server and restart — per-key
        auth and rate limits still apply.
      </div>
      <div className="callout callout-tip">
        <strong>Sender fixed to your platform domain:</strong> every send uses{' '}
        <code>noreply@onboard.qd.je</code> (or <code>DEFAULT_FROM_EMAIL</code>).
        A custom <code>from</code> is accepted but its address is replaced —
        only your display name is kept — so mail always passes provider
        verification. Send to a <strong>single</strong> <code>to</code> address
        per request.
      </div>

      <h2>Installation</h2>
      <table>
        <thead>
          <tr><th>Language</th><th>Package</th><th>Install</th></tr>
        </thead>
        <tbody>
          <tr><td>Node.js / TS</td><td><code>@envoy/sdk</code></td><td><code>cd sdk/node &amp;&amp; npm install &amp;&amp; npm run build</code></td></tr>
          <tr><td>Python</td><td><code>envoy-sdk</code></td><td><code>pip install ./sdk/python</code></td></tr>
          <tr><td>Go</td><td><code>github.com/maskedes/envoy-go</code></td><td>not published — use a <code>replace</code> to <code>./sdk/go</code></td></tr>
          <tr><td>PHP</td><td>—</td><td>no official SDK yet — call the REST API</td></tr>
          <tr><td>Ruby</td><td>—</td><td>no official SDK yet — call the REST API</td></tr>
        </tbody>
      </table>

      <h2>Authentication</h2>
      <p>
        Create an API key from the dashboard (keys are prefixed with <code>fms_</code>)
        and expose it through the <code>ENVOY_API_KEY</code> environment variable.
        The SDK sends it as the <code>x-api-key</code> header on every request — you
        never set the header by hand when using an SDK.
      </p>
      <pre><code>{`export ENVOY_API_KEY="fms_xxxxxxxxxxxxxxxx"`}</code></pre>

      <h2>The emails.send method</h2>
      <h3>Required fields</h3>
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>to</code></td><td>string</td><td>Single recipient address (one per request)</td></tr>
          <tr><td><code>subject</code></td><td>string</td><td>Email subject</td></tr>
          <tr><td><code>html</code> <em>or</em> <code>text</code></td><td>string</td><td>Body — at least one is required</td></tr>
        </tbody>
      </table>

      <h3>Optional fields</h3>
      <table>
        <thead>
          <tr><th>Field</th><th>Type</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>from</code></td><td>string</td><td>Accepted but replaced by your platform sending domain (only your display name is kept)</td></tr>
          <tr><td><code>reply_to</code></td><td>string</td><td>Reply-To address</td></tr>
          <tr><td><code>tags</code></td><td>object</td><td>Key/value metadata (e.g. <code>{'{ campaign: "welcome" }'}</code>)</td></tr>
          <tr><td><code>scheduleInMs</code></td><td>number</td><td>Delay delivery by N milliseconds</td></tr>
        </tbody>
      </table>

      <h3>Response</h3>
      <pre><code>{`{
  "id": "a1b2c3d4-...",
  "from": "noreply@onboard.qd.je",
  "to": "user@example.com",
  "subject": "Welcome aboard!",
  "status": "queued",
  "created_at": "2026-08-08T12:00:00.000Z"
}`}</code></pre>

      <h2>Code examples</h2>

      <h3>CLI</h3>
      <pre><code>{`curl -X POST http://78.154.103.19:12083/api/emails/send -H "Content-Type: application/json" -H "x-api-key: $ENVOY_API_KEY" -d '{"from":"noreply@onboard.qd.je","to":"user@example.com","subject":"Welcome aboard!","html":"<h1>Hello!</h1><p>Your account is ready.</p>"}'`}</code></pre>

      <h3>Node.js</h3>
      <pre><code>{`import { ENovoy } from '@envoy/sdk';

const envoy = new ENovoy({ apiKey: process.env.ENVOY_API_KEY });

const result = await envoy.emails.send({
  from: 'noreply@onboard.qd.je',
  to: 'user@example.com',
  subject: 'Welcome aboard!',
  html: '<h1>Hello!</h1><p>Your account is ready.</p>',
});

console.log(result.id); // queued message id`}</code></pre>

      <h3>Python</h3>
      <pre><code>{`import os
from envoy_sdk import ENovoy

envoy = ENovoy(
    api_key=os.environ["ENVOY_API_KEY"]
)

result = envoy.emails.send(
    from_address="noreply@onboard.qd.je",
    to="user@example.com",
    subject="Welcome aboard!",
    html="""
    <h1>Hello!</h1>
    <p>Your account is ready.</p>
    """,
)

print(result.id)  # queued message id`}</code></pre>

      <h3>Go</h3>
      <pre><code>{`package main

import (
    "fmt"
    "os"
    envoy "github.com/maskedes/envoy-go"
)

func main() {
    client := envoy.New(os.Getenv("ENVOY_API_KEY"))

    result, err := client.Emails.Send(&envoy.SendRequest{
        From:    "noreply@onboard.qd.je",
        To:      "user@example.com",
        Subject: "Welcome aboard!",
        HTML:    "<h1>Hello!</h1><p>Your account is ready.</p>",
    })
    if err != nil {
        panic(err)
    }
    fmt.Println(result.ID)
}`}</code></pre>

      <h3>PHP</h3>
      <pre><code>{`<?php

require 'vendor/autoload.php';

use EnvoySdk\\Envoy;

$client = new Envoy($_ENV['ENVOY_API_KEY']);

$result = $client->emails->send([
    'from'    => 'noreply@onboard.qd.je',
    'to'      => ['user@example.com'],
    'subject' => 'Welcome aboard!',
    'html'    => '<h1>Hello!</h1><p>Your account is ready.</p>',
]);

echo $result->id; // queued message ID`}</code></pre>

      <h3>Ruby</h3>
      <pre><code>{`require 'envoy'

client = ENovoy.new(api_key: ENV['ENVOY_API_KEY'])

result = client.emails.send(
  from: 'noreply@onboard.qd.je',
  to: 'user@example.com',
  subject: 'Welcome aboard!',
  html: '<h1>Hello!</h1><p>Your account is ready.</p>',
)

puts result.id # queued message id`}</code></pre>

      <h3>JavaScript</h3>
      <pre><code>{`const response = await fetch("http://78.154.103.19:12083/api/emails/send", {
  method: "POST",
  headers: {
    "x-api-key": process.env.ENVOY_API_KEY,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    from: "noreply@onboard.qd.je",
    to: "user@example.com",
    subject: "Welcome aboard!",
    html: "<h1>Hello!</h1><p>Your account is ready.</p>"
  })
});

const result = await response.json();
console.log(result.id);`}</code></pre>

      <h3>TypeScript</h3>
      <pre><code>{`const response = await fetch("http://78.154.103.19:12083/api/emails/send", {
  method: "POST",
  headers: {
    "x-api-key": process.env.ENVOY_API_KEY,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    from: "noreply@onboard.qd.je",
    to: "user@example.com",
    subject: "Welcome aboard!",
    html: "<h1>Hello!</h1><p>Your account is ready.</p>"
  })
});

const result: { id: string } = await response.json();
console.log(result.id);`}</code></pre>

      <h3>Java</h3>
      <pre><code>{`import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;

String body = """
    {
      "from": "noreply@onboard.qd.je",
      "to": "user@example.com",
      "subject": "Welcome aboard!",
      "html": "<h1>Hello!</h1><p>Your account is ready.</p>"
    }
    """;

HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("http://78.154.103.19:12083/api/emails/send"))
    .header("x-api-key", System.getenv("ENVOY_API_KEY"))
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(body))
    .build();

HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.statusCode());`}</code></pre>

      <h3>Kotlin</h3>
      <pre><code>{`import io.ktor.client.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*

val client = HttpClient()
val response: HttpResponse = client.post("http://78.154.103.19:12083/api/emails/send") {
    header("x-api-key", System.getenv("ENVOY_API_KEY"))
    header("Content-Type", "application/json")
    setBody("""
        {
          "from": "noreply@onboard.qd.je",
          "to": "user@example.com",
          "subject": "Welcome aboard!",
          "html": "<h1>Hello!</h1><p>Your account is ready.</p>"
        }
    """)
}
println(response.status.value)`}</code></pre>

      <h3>C#</h3>
      <pre><code>{`using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

var client = new HttpClient();
var json = @"{""from"":""noreply@onboard.qd.je"",""to"":""user@example.com"",""subject"":""Welcome aboard!"",""html"":""<h1>Hello!</h1><p>Your account is ready.</p>""}";

var request = new HttpRequestMessage(HttpMethod.Post, "http://78.154.103.19:12083/api/emails/send");
request.Headers.Add("x-api-key", Environment.GetEnvironmentVariable("ENVOY_API_KEY"));
request.Content = new StringContent(json, Encoding.UTF8, "application/json");

var response = await client.SendAsync(request);
Console.WriteLine((int)response.StatusCode);`}</code></pre>

      <h3>Rust</h3>
      <pre><code>{`use reqwest::Client;
use serde_json::json;
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new();
    let res = client
        .post("http://78.154.103.19:12083/api/emails/send")
        .header("x-api-key", env::var("ENVOY_API_KEY")?)
        .json(&json!({
            "from": "noreply@onboard.qd.je",
            "to": "user@example.com",
            "subject": "Welcome aboard!",
            "html": "<h1>Hello!</h1><p>Your account is ready.</p>"
        }))
        .send()
        .await?;

    println!("{}", res.status());
    Ok(())
}`}</code></pre>

      <h3>Swift</h3>
      <pre><code>{`import Foundation

let url = URL(string: "http://78.154.103.19:12083/api/emails/send")!
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue(ProcessInfo.processInfo.environment["ENVOY_API_KEY"] ?? "", forHTTPHeaderField: "x-api-key")
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.httpBody = try? JSONSerialization.data(withJSONObject: [
    "from": "noreply@onboard.qd.je",
    "to": "user@example.com",
    "subject": "Welcome aboard!",
    "html": "<h1>Hello!</h1><p>Your account is ready.</p>"
])

let task = URLSession.shared.dataTask(with: request) { data, response, error in
    if let httpResponse = response as? HTTPURLResponse {
        print(httpResponse.statusCode)
    }
}
task.resume()`}</code></pre>

      <h3>Dart</h3>
      <pre><code>{`import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

void main() async {
  final response = await http.post(
    Uri.parse('http://78.154.103.19:12083/api/emails/send'),
    headers: {
      'x-api-key': Platform.environment['ENVOY_API_KEY'] ?? '',
      'Content-Type': 'application/json',
    },
    body: jsonEncode({
      'from': 'noreply@onboard.qd.je',
      'to': 'user@example.com',
      'subject': 'Welcome aboard!',
      'html': '<h1>Hello!</h1><p>Your account is ready.</p>',
    }),
  );
  print(response.statusCode);
}`}</code></pre>

      <h3>C++</h3>
      <pre><code>{`#include <curl/curl.h>
#include <iostream>

int main() {
    CURL* curl = curl_easy_init();
    if (curl) {
        const char* key = std::getenv("ENVOY_API_KEY");
        std::string auth = std::string("x-api-key: ") + (key ? key : "");

        struct curl_slist* headers = nullptr;
        headers = curl_slist_append(headers, auth.c_str());
        headers = curl_slist_append(headers, "Content-Type: application/json");

        curl_easy_setopt(curl, CURLOPT_URL, "http://78.154.103.19:12083/api/emails/send");
        curl_easy_setopt(curl, CURLOPT_POST, 1L);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS,
            R"({"from":"noreply@onboard.qd.je","to":"user@example.com","subject":"Welcome aboard!","html":"<h1>Hello!</h1><p>Your account is ready.</p>"})");

        curl_easy_perform(curl);
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }
    return 0;
}`}</code></pre>

      <h3>Elixir</h3>
      <pre><code>{`Mix.install([{:req, "~> 0.5"}])

body = %{
  from: "noreply@onboard.qd.je",
  to: "user@example.com",
  subject: "Welcome aboard!",
  html: "<h1>Hello!</h1><p>Your account is ready.</p>"
}

Req.post!(
  "http://78.154.103.19:12083/api/emails/send",
  headers: [{"x-api-key", System.get_env("ENVOY_API_KEY")}],
  json: body
)`}</code></pre>

      <h2>Next steps</h2>
      <ul>
        <li><Link href="/api/send">API reference: Send Email</Link> — full field &amp; error reference</li>
        <li><Link href="/quickstart">Quickstart</Link> — send your first email in 2 minutes</li>
        <li><Link href="/sdks/node">Node.js SDK</Link> · <Link href="/sdks/python">Python SDK</Link> · <Link href="/sdks/go">Go SDK</Link></li>
      </ul>
    </div>
  );
}
