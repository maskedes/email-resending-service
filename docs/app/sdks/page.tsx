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
        All examples below are the exact same snippets shown on the landing page and
        are verified against the live API contract: <code>x-api-key</code> auth,
        <code> https://api.freemailsend.dev/api/emails/send</code>, and a
        <code> 200</code> response containing <code>id</code>.
      </div>

      <h2>Installation</h2>
      <table>
        <thead>
          <tr><th>Language</th><th>Package</th><th>Install</th></tr>
        </thead>
        <tbody>
          <tr><td>Node.js / TS</td><td><code>@envoy/sdk</code></td><td><code>npm install @envoy/sdk</code></td></tr>
          <tr><td>Python</td><td><code>envoy-sdk</code></td><td><code>pip install envoy-sdk</code></td></tr>
          <tr><td>Go</td><td><code>github.com/maskedes/envoy-go</code></td><td><code>go get github.com/maskedes/envoy-go</code></td></tr>
          <tr><td>PHP</td><td><code>envoy-sdk</code></td><td><code>composer require envoy-sdk</code></td></tr>
          <tr><td>Ruby</td><td><code>envoy</code></td><td><code>gem install envoy</code></td></tr>
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
          <tr><td><code>to</code></td><td>string | string[]</td><td>Recipient address(es)</td></tr>
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
          <tr><td><code>from</code></td><td>string</td><td>Sender address (falls back to your default domain)</td></tr>
          <tr><td><code>reply_to</code></td><td>string</td><td>Reply-To address</td></tr>
          <tr><td><code>tags</code></td><td>object</td><td>Key/value metadata (e.g. <code>{'{ campaign: "welcome" }'}</code>)</td></tr>
          <tr><td><code>scheduleInMs</code></td><td>number</td><td>Delay delivery by N milliseconds</td></tr>
        </tbody>
      </table>

      <h3>Response</h3>
      <pre><code>{`{
  "id": "a1b2c3d4-...",
  "from": "hello@mail.yourdomain.com",
  "to": ["user@example.com"],
  "subject": "Welcome aboard!",
  "status": "queued",
  "created_at": "2026-08-08T12:00:00.000Z"
}`}</code></pre>

      <h2>Code examples</h2>

      <h3>CLI</h3>
      <pre><code>{`curl -X POST https://api.freemailsend.dev/api/emails/send -H "Content-Type: application/json" -H "x-api-key: $ENVOY_API_KEY" -d '{"from":"hello@mail.yourdomain.com","to":["user@example.com"],"subject":"Welcome aboard!","html":"<h1>Hello!</h1><p>Your account is ready.</p>"}'`}</code></pre>

      <h3>Node.js</h3>
      <pre><code>{`import { ENovoy } from '@envoy/sdk';

const envoy = new ENovoy({ apiKey: process.env.ENVOY_API_KEY });

const result = await envoy.emails.send({
  from: 'hello@mail.yourdomain.com',
  to: ['user@example.com'],
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
    from_address="hello@mail.yourdomain.com",
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
        From:    "hello@mail.yourdomain.com",
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
    'from'    => 'hello@mail.yourdomain.com',
    'to'      => ['user@example.com'],
    'subject' => 'Welcome aboard!',
    'html'    => '<h1>Hello!</h1><p>Your account is ready.</p>',
]);

echo $result->id; // queued message ID`}</code></pre>

      <h3>Ruby</h3>
      <pre><code>{`require 'envoy'

client = ENovoy.new(api_key: ENV['ENVOY_API_KEY'])

result = client.emails.send(
  from: 'hello@mail.yourdomain.com',
  to: 'user@example.com',
  subject: 'Welcome aboard!',
  html: '<h1>Hello!</h1><p>Your account is ready.</p>',
)

puts result.id # queued message id`}</code></pre>

      <h3>JavaScript</h3>
      <pre><code>{`const response = await fetch("https://api.freemailsend.dev/api/emails/send", {
  method: "POST",
  headers: {
    "x-api-key": process.env.ENVOY_API_KEY,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    from: "hello@mail.yourdomain.com",
    to: ["user@example.com"],
    subject: "Welcome aboard!",
    html: "<h1>Hello!</h1><p>Your account is ready.</p>"
  })
});

const result = await response.json();
console.log(result.id);`}</code></pre>

      <h3>TypeScript</h3>
      <pre><code>{`const response = await fetch("https://api.freemailsend.dev/api/emails/send", {
  method: "POST",
  headers: {
    "x-api-key": process.env.ENVOY_API_KEY,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    from: "hello@mail.yourdomain.com",
    to: ["user@example.com"],
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
      "from": "hello@mail.yourdomain.com",
      "to": ["user@example.com"],
      "subject": "Welcome aboard!",
      "html": "<h1>Hello!</h1><p>Your account is ready.</p>"
    }
    """;

HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.freemailsend.dev/api/emails/send"))
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
val response: HttpResponse = client.post("https://api.freemailsend.dev/api/emails/send") {
    header("x-api-key", System.getenv("ENVOY_API_KEY"))
    header("Content-Type", "application/json")
    setBody("""
        {
          "from": "hello@mail.yourdomain.com",
          "to": ["user@example.com"],
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
var json = @"{""from"":""hello@mail.yourdomain.com"",""to"":[""user@example.com""],""subject"":""Welcome aboard!"",""html"":""<h1>Hello!</h1><p>Your account is ready.</p>""}";

var request = new HttpRequestMessage(HttpMethod.Post, "https://api.freemailsend.dev/api/emails/send");
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
        .post("https://api.freemailsend.dev/api/emails/send")
        .header("x-api-key", env::var("ENVOY_API_KEY")?)
        .json(&json!({
            "from": "hello@mail.yourdomain.com",
            "to": ["user@example.com"],
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

let url = URL(string: "https://api.freemailsend.dev/api/emails/send")!
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue(ProcessInfo.processInfo.environment["ENVOY_API_KEY"] ?? "", forHTTPHeaderField: "x-api-key")
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.httpBody = try? JSONSerialization.data(withJSONObject: [
    "from": "hello@mail.yourdomain.com",
    "to": ["user@example.com"],
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
    Uri.parse('https://api.freemailsend.dev/api/emails/send'),
    headers: {
      'x-api-key': Platform.environment['ENVOY_API_KEY'] ?? '',
      'Content-Type': 'application/json',
    },
    body: jsonEncode({
      'from': 'hello@mail.yourdomain.com',
      'to': ['user@example.com'],
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

        curl_easy_setopt(curl, CURLOPT_URL, "https://api.freemailsend.dev/api/emails/send");
        curl_easy_setopt(curl, CURLOPT_POST, 1L);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS,
            R"({"from":"hello@mail.yourdomain.com","to":["user@example.com"],"subject":"Welcome aboard!","html":"<h1>Hello!</h1><p>Your account is ready.</p>"})");

        curl_easy_perform(curl);
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }
    return 0;
}`}</code></pre>

      <h3>Elixir</h3>
      <pre><code>{`Mix.install([{:req, "~> 0.5"}])

body = %{
  from: "hello@mail.yourdomain.com",
  to: ["user@example.com"],
  subject: "Welcome aboard!",
  html: "<h1>Hello!</h1><p>Your account is ready.</p>"
}

Req.post!(
  "https://api.freemailsend.dev/api/emails/send",
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
