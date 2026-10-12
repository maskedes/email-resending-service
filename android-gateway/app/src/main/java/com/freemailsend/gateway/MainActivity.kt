package com.freemailsend.gateway

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {
    private fun prefs(): SharedPreferences = getSharedPreferences("gateway", Context.MODE_PRIVATE)

    private val permLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { res ->
        if (res.values.all { it }) Toast.makeText(this, "Permissions granted", Toast.LENGTH_SHORT).show()
        else Toast.makeText(this, "SMS permission is required", Toast.LENGTH_LONG).show()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
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

        btnSave.setOnClickListener outer@{
            val url = serverUrl.text.toString().trim().trimEnd('/')
            val token = gatewayToken.text.toString().trim()
            if (url.isEmpty() || token.isEmpty()) { Toast.makeText(this, "Fill server URL and gateway token", Toast.LENGTH_SHORT).show(); return@outer }
            prefs().edit().putString("serverUrl", url).putString("gatewayToken", token).apply()
            Toast.makeText(this, "Saved", Toast.LENGTH_SHORT).show()
        }
        btnStart.setOnClickListener outer@{
            ensurePermissions()
            val url = prefs().getString("serverUrl", "") ?: ""
            val token = prefs().getString("gatewayToken", "") ?: ""
            if (url.isEmpty() || token.isEmpty()) { Toast.makeText(this, "Save server URL + token first", Toast.LENGTH_SHORT).show(); return@outer }
            startForegroundService(Intent(this, GatewayService::class.java))
            status.text = "Gateway running — check notification"
        }
        btnStop.setOnClickListener {
            stopService(Intent(this, GatewayService::class.java))
            status.text = "Stopped"
        }
    }

    private fun ensurePermissions() {
        val needed = mutableListOf(Manifest.permission.SEND_SMS, Manifest.permission.READ_PHONE_STATE)
        if (Build.VERSION.SDK_INT >= 33) needed.add(Manifest.permission.POST_NOTIFICATIONS)
        val missing = needed.filter { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }
        if (missing.isNotEmpty()) permLauncher.launch(missing.toTypedArray())
    }
}
