package com.freemailsend.gateway

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.content.ContextCompat
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {
    private fun prefs(): SharedPreferences = getSharedPreferences("gateway", Context.MODE_PRIVATE)

    /** Whether a pending Start action should fire once permissions resolve. */
    private var pendingStart = false

    /** Blocks programmatic switch toggles from re-entering onCheckedChange. */
    private var suppressSwitchSync = false

    /** Theme override cycle: System → Dark → Light. */
    private val themeOrder = listOf("system", "dark", "light")

    private fun applyThemeMode() {
        when (prefs().getString("theme_mode", "system")) {
            "dark" -> AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES)
            "light" -> AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO)
            else -> AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM)
        }
    }

    private fun cycleThemeMode() {
        val current = prefs().getString("theme_mode", "system") ?: "system"
        val next = themeOrder[(themeOrder.indexOf(current) + 1) % themeOrder.size]
        prefs().edit().putString("theme_mode", next).apply()
        applyThemeMode()
        // re-apply is sticky for this activity only after recreate
        recreate()
    }

    private val logReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context?, intent: Intent?) = refreshLogs()
    }

    private val permLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { res ->
        if (res.values.all { it }) {
            Toast.makeText(this, "Permissions granted", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(this, "SMS permission is required", Toast.LENGTH_LONG).show()
        }
        if (pendingStart) {
            pendingStart = false
            if (res.values.all { it }) startGateway()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        applyThemeMode() // must run before inflation so the night qualifier applies
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val serverUrl = findViewById<EditText>(R.id.serverUrl)
        val gatewayToken = findViewById<EditText>(R.id.gatewayToken)
        val status = findViewById<TextView>(R.id.status)
        val btnSave = findViewById<Button>(R.id.btnSave)
        val btnStart = findViewById<Button>(R.id.btnStart)
        val btnStop = findViewById<Button>(R.id.btnStop)

        serverUrl.setText(prefs().getString("serverUrl", ""))
        gatewayToken.setText(prefs().getString("gatewayToken", ""))

        // Device identity line (TextBee-style "Device ID:")
        val deviceId = android.provider.Settings.Secure.getString(
            contentResolver, android.provider.Settings.Secure.ANDROID_ID
        )?.take(8)?.lowercase() ?: "unknown"
        findViewById<TextView>(R.id.deviceIdInfoTxt)?.text = deviceId
        findViewById<android.view.View>(R.id.copyDeviceIdImgBtn)?.setOnClickListener {
            val clip = android.content.ClipData.newPlainText("device id", deviceId)
            (getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager).setPrimaryClip(clip)
            Toast.makeText(this, "Device ID copied", Toast.LENGTH_SHORT).show()
        }

        // Master gateway switch stays in sync with start/stop
        val gatewaySwitch = findViewById<android.widget.Switch>(R.id.gatewaySwitch)
        gatewaySwitch.setOnCheckedChangeListener { _, checked ->
            if (suppressSwitchSync) return@setOnCheckedChangeListener
            if (checked) {
                val url = prefs().getString("serverUrl", "") ?: ""
                val token = prefs().getString("gatewayToken", "") ?: ""
                if (url.isEmpty() || token.isEmpty()) {
                    Toast.makeText(this, "Save server URL + token first", Toast.LENGTH_SHORT).show()
                    suppressSwitchSync = true; gatewaySwitch.isChecked = false; suppressSwitchSync = false
                    return@setOnCheckedChangeListener
                }
                startGateway()
            } else {
                stopService(Intent(this, GatewayService::class.java))
                status.text = "Stopped"
            }
        }

        // Auto-start on boot preference
        val autoStart = findViewById<android.widget.Switch>(R.id.autoStartSwitch)
        autoStart.isChecked = prefs().getBoolean("autoStartOnBoot", true)
        autoStart.setOnCheckedChangeListener { _, checked ->
            prefs().edit().putBoolean("autoStartOnBoot", checked).apply()
        }

        findViewById<android.view.View>(R.id.grantSmsPermissionsBtn)?.setOnClickListener { ensurePermissions() }
        findViewById<android.view.View>(R.id.deviceHealthBtn)?.setOnClickListener {
            startActivity(Intent(this, DeviceHealthActivity::class.java))
        }
        // Theme cycle button + subtitle mirror
        val themeBtn = findViewById<Button>(R.id.themeBtn)
        val themeSubtitle = findViewById<TextView>(R.id.themeSubtitleTxt)
        fun syncThemeUi() {
            val mode = prefs().getString("theme_mode", "system") ?: "system"
            themeBtn?.text = when (mode) {
                "dark" -> "Dark"
                "light" -> "Light"
                else -> "Auto"
            }
            themeSubtitle?.text = when (mode) {
                "dark" -> "Forced dark"
                "light" -> "Forced light"
                else -> "Follow system"
            }
        }
        syncThemeUi()
        themeBtn?.setOnClickListener {
            cycleThemeMode()
        }

        btnSave.setOnClickListener outer@{
            val url = serverUrl.text.toString().trim().trimEnd('/')
            val token = gatewayToken.text.toString().trim()
            if (url.isEmpty() || token.isEmpty()) {
                Toast.makeText(this, "Fill server URL and gateway token", Toast.LENGTH_SHORT).show()
                return@outer
            }
            prefs().edit().putString("serverUrl", url).putString("gatewayToken", token).apply()
            Toast.makeText(this, "Saved — testing connection…", Toast.LENGTH_SHORT).show()
            testConnection(url, token, status)
        }
        btnStart.setOnClickListener outer@{
            val url = prefs().getString("serverUrl", "") ?: ""
            val token = prefs().getString("gatewayToken", "") ?: ""
            if (url.isEmpty() || token.isEmpty()) {
                Toast.makeText(this, "Save server URL + token first", Toast.LENGTH_SHORT).show()
                return@outer
            }
            if (!ensurePermissions()) {
                pendingStart = true // the permission callback finishes the start when granted
                Toast.makeText(this, "Grant SMS permission to start", Toast.LENGTH_SHORT).show()
                return@outer
            }
            startGateway()
        }
        btnStop.setOnClickListener {
            stopService(Intent(this, GatewayService::class.java))
            status.text = "Stopped"
            val sw = findViewById<android.widget.Switch>(R.id.gatewaySwitch)
            suppressSwitchSync = true
            sw?.isChecked = false
            suppressSwitchSync = false
        }
    }

    override fun onResume() {
        super.onResume()
        refreshLogs()
        ContextCompat.registerReceiver(
            this, logReceiver,
            IntentFilter(GatewayService.ACTION_LOG_UPDATED),
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
    }

    override fun onPause() {
        super.onPause()
        try { unregisterReceiver(logReceiver) } catch (_: Exception) {}
    }

    private fun startGateway() {
        startForegroundService(Intent(this, GatewayService::class.java))
        findViewById<TextView>(R.id.status).text = "Gateway running — check notification"
        val sw = findViewById<android.widget.Switch>(R.id.gatewaySwitch)
        suppressSwitchSync = true
        sw?.isChecked = true
        suppressSwitchSync = false
    }

    /**
     * Requests missing SMS/notification permissions.
     * @return true when everything is already granted (caller may proceed immediately).
     */
    private fun ensurePermissions(): Boolean {
        val needed = mutableListOf(Manifest.permission.SEND_SMS, Manifest.permission.READ_PHONE_STATE)
        if (Build.VERSION.SDK_INT >= 33) needed.add(Manifest.permission.POST_NOTIFICATIONS)
        val missing = needed.filter { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }
        if (missing.isNotEmpty()) {
            permLauncher.launch(missing.toTypedArray())
            return false
        }
        return true
    }

    /** Fires /api/sms/gateway/heartbeat and reports reachability on the status line. */
    private fun testConnection(url: String, token: String, status: TextView) {
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
            runOnUiThread {
                status.text = if (ok) "✓ Server reachable ($detail)" else "✗ Connection failed — $detail"
            }
        }
    }

    /** Renders the on-device send log (newest first) into the activity card. */
    private fun refreshLogs() {
        val container = findViewById<LinearLayout>(R.id.logsContainer) ?: return
        val isNight = (resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK) ==
            android.content.res.Configuration.UI_MODE_NIGHT_YES
        val baseColor = if (isNight) 0xFF94A3B8.toInt() else 0xFF64748B.toInt()
        val failColor = 0xFFDC2626.toInt()

        container.removeAllViews()
        val arr = try {
            JSONArray(prefs().getString("smsLog", "[]") ?: "[]")
        } catch (_: Exception) {
            JSONArray()
        }
        if (arr.length() == 0) {
            container.addView(makeRow("No messages relayed yet.", baseColor))
            return
        }
        val fmt = SimpleDateFormat("dd MMM HH:mm:ss", Locale.getDefault())
        for (i in 0 until arr.length()) {
            val e = arr.optJSONObject(i) ?: continue
            val st = e.optString("status")
            val when_ = fmt.format(Date(e.optLong("ts")))
            val to = e.optString("to")
            val body = e.optString("body")
            val err = e.optString("error").takeUnless { it.isEmpty() || it == "null" }

            val badge = when (st) {
                "delivered" -> "✔ delivered"
                "sent" -> "➤ sent"
                else -> "✕ failed"
            }
            var text = "$when_   $badge   $to"
            if (body.isNotEmpty()) text += "\n  $body"
            if (err != null) text += "\n  ⚠ $err"

            container.addView(
                makeRow(
                    text,
                    if (st == "failed") failColor else baseColor
                )
            )
        }
    }

    private fun makeRow(text: String, color: Int): TextView = TextView(this).apply {
        setPadding(0, 10, 0, 10)
        textSize = 13f
        setTextColor(color)
        this.text = text
    }
}
