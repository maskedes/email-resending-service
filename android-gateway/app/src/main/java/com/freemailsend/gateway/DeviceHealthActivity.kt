package com.freemailsend.gateway

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * TextBee "Device Health" equivalent: one row per vital check, each with a
 * status text and an action button. Tapping "Refresh" re-renders everything.
 * The health card on the home screen leads here; nothing is destructive.
 */
class DeviceHealthActivity : AppCompatActivity() {
    private fun prefs(): SharedPreferences = getSharedPreferences("gateway", Context.MODE_PRIVATE)

    private val permLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        refresh()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_device_health)

        findViewById<android.view.View>(R.id.backButton).setOnClickListener { finish() }

        findViewById<android.view.View>(R.id.btnServiceNow).setOnClickListener {
            val running = prefs().getBoolean("gatewayRunning", false)
            if (running) {
                stopService(Intent(this, GatewayService::class.java))
            } else {
                startForegroundService(Intent(this, GatewayService::class.java))
            }
            refresh()
        }
        findViewById<android.view.View>(R.id.btnGrantSms).setOnClickListener {
            permLauncher.launch(arrayOf(Manifest.permission.SEND_SMS, Manifest.permission.READ_PHONE_STATE))
        }
        findViewById<android.view.View>(R.id.btnGrantNotif).setOnClickListener {
            if (Build.VERSION.SDK_INT >= 33) {
                permLauncher.launch(arrayOf(Manifest.permission.POST_NOTIFICATIONS))
            } else {
                Toast.makeText(this, "Notifications permission not needed on this Android version", Toast.LENGTH_SHORT).show()
            }
        }
        findViewById<android.view.View>(R.id.btnToggleAutoStart).setOnClickListener {
            val now = prefs().getBoolean("autoStartOnBoot", true)
            prefs().edit().putBoolean("autoStartOnBoot", !now).apply()
            refresh()
        }
        findViewById<android.view.View>(R.id.btnHeartbeatNow).setOnClickListener {
            heartbeatNow()
        }

        refresh()
    }

    override fun onResume() { super.onResume(); refresh() }

    private fun heartbeatNow() {
        val url = prefs().getString("serverUrl", "")?.trimEnd('/') ?: ""
        val token = prefs().getString("gatewayToken", "") ?: ""
        if (url.isEmpty() || token.isEmpty()) {
            Toast.makeText(this, "Save server URL + token on the home screen first", Toast.LENGTH_SHORT).show()
            return
        }
        Toast.makeText(this, "Pinging server…", Toast.LENGTH_SHORT).show()
        Executors.newSingleThreadExecutor().execute {
            var ok = false
            var detail: String
            try {
                val client = OkHttpClient.Builder()
                    .connectTimeout(10, TimeUnit.SECONDS)
                    .readTimeout(10, TimeUnit.SECONDS)
                    .build()
                val resp = client.newCall(
                    Request.Builder()
                        .url("$url/api/sms/gateway/heartbeat")
                        .header("x-gateway-token", token)
                        .post("{}".toRequestBody("application/json; charset=utf-8".toMediaType()))
                        .build()
                ).execute()
                ok = resp.code in 200..299
                detail = "HTTP ${resp.code}"
                resp.close()
            } catch (e: Exception) {
                detail = e.message?.take(80) ?: "network error"
            }
            prefs().edit()
                .putLong("lastHeartbeatTs", System.currentTimeMillis())
                .putBoolean("lastHeartbeatOk", ok)
                .apply()
            runOnUiThread {
                Toast.makeText(this, if (ok) "✓ Heartbeat OK ($detail)" else "✗ Failed — $detail", Toast.LENGTH_SHORT).show()
                refresh()
            }
        }
    }

    private fun refresh() {
        val running = prefs().getBoolean("gatewayRunning", false)
        setStatus("btnServiceNow", "statusServiceTxt", running,
            okText = "Gateway service — running",
            badText = "Gateway service — stopped",
            btnText = if (running) "Stop" else "Start")

        val smsOk = arrayOf(Manifest.permission.SEND_SMS, Manifest.permission.READ_PHONE_STATE)
            .all { ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED }
        setStatus("btnGrantSms", "statusSmsTxt", smsOk,
            okText = "SMS permission — granted",
            badText = "SMS permission — missing",
            btnText = "Grant")

        val notifOk = if (Build.VERSION.SDK_INT >= 33) {
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
        } else true
        setStatus("btnGrantNotif", "statusNotifTxt", notifOk,
            okText = "Notification permission — granted",
            badText = "Notification permission — missing",
            btnText = "Grant")

        val bootOk = prefs().getBoolean("autoStartOnBoot", true)
        setStatus("btnToggleAutoStart", "statusBootTxt", bootOk,
            okText = "Auto-start on boot — enabled",
            badText = "Auto-start on boot — disabled",
            btnText = "Toggle")

        val hbTs = prefs().getLong("lastHeartbeatTs", 0L)
        val hbOk = prefs().getBoolean("lastHeartbeatOk", false)
        val hbText = if (hbTs == 0L) {
            "Never pinged"
        } else {
            "${java.text.SimpleDateFormat("dd MMM HH:mm:ss", Locale.getDefault()).format(Date(hbTs))} — ${if (hbOk) "OK" else "FAILED"}"
        }
        setStatus("btnHeartbeatNow", "statusHeartbeatTxt", hbOk && hbTs > 0L,
            okText = "Last heartbeat: $hbText",
            badText = "Last heartbeat: $hbText",
            btnText = "Ping")

        val failing = listOf(running, smsOk, notifOk, bootOk, hbOk && hbTs > 0L).count { !it }
        findViewById<TextView>(R.id.summaryTxt).text = if (failing == 0) {
            "✓ All health checks pass — gateway is ready to relay."
        } else {
            "⚠ $failing check(s) failing — SMS relay may not work."
        }
    }

    private fun setStatus(btnId: String, txtId: String, ok: Boolean, okText: String, badText: String, btnText: String) {
        val btn = findViewById<android.widget.Button>(resources.getIdentifier(btnId, "id", packageName))
        val txt = findViewById<TextView>(resources.getIdentifier(txtId, "id", packageName))
        if (btn != null) { btn.text = btnText }
        if (txt != null) {
            txt.text = if (ok) okText else badText
            txt.setTextColor(if (ok) 0xFF059669.toInt() else 0xFFDC2626.toInt())
        }
    }
}
