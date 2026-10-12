package com.freemailsend.gateway

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.os.Build
import android.os.IBinder
import android.telephony.SmsManager
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class GatewayService : Service() {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val client = OkHttpClient.Builder().connectTimeout(30, TimeUnit.SECONDS).readTimeout(40, TimeUnit.SECONDS).build()
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    private fun prefs(): SharedPreferences = getSharedPreferences("gateway", Context.MODE_PRIVATE)
    private fun serverUrl(): String = prefs().getString("serverUrl", "")!!.trimEnd('/')
    private fun gatewayToken(): String = prefs().getString("gatewayToken", "")!!

    override fun onCreate() {
        super.onCreate()
        createChannel()
        startForeground(1, notification("E-NVOY Gateway — running"))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        scope.launch { pollLoop() }
        return START_STICKY
    }

    override fun onDestroy() { scope.cancel(); super.onDestroy() }
    override fun onBind(intent: Intent?): IBinder? = null

    private suspend fun pollLoop() {
        while (scope.isActive) {
            try {
                val url = serverUrl()
                val token = gatewayToken()
                if (url.isEmpty() || token.isEmpty()) { delay(5000); continue }
                val req = Request.Builder().url("$url/api/sms/gateway/jobs").header("x-gateway-token", token).get().build()
                val resp = withContext(Dispatchers.IO) { client.newCall(req).execute() }
                val body = resp.body?.string() ?: "{}"
                resp.close()
                if (resp.code == 200) {
                    val jobs = JSONObject(body).optJSONArray("jobs")
                    if (jobs != null) for (i in 0 until jobs.length()) {
                        val j = jobs.getJSONObject(i)
                        val id = j.getString("id"); val to = j.getString("to"); val text = j.getString("body")
                        sendSms(id, to, text)
                    }
                }
                // heartbeat every poll
                heartbeat()
            } catch (_: Exception) { delay(3000) }
        }
    }

    private fun sendSms(smsId: String, to: String, body: String) {
        try {
            val smsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) getSystemService(SmsManager::class.java) else @Suppress("DEPRECATION") SmsManager.getDefault()
            val parts = smsManager.divideMessage(body)
            val sentAction = "SMS_SENT_$smsId"
            val deliveredAction = "SMS_DELIVERED_$smsId"
            val sentPI = PendingIntent.getBroadcast(this, smsId.hashCode(), Intent(sentAction), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            val deliveredPI = PendingIntent.getBroadcast(this, smsId.hashCode() + 1, Intent(deliveredAction), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

            val sentReceiver = object : BroadcastReceiver() {
                override fun onReceive(ctx: Context?, intent: Intent?) {
                    val ok = resultCode == android.app.Activity.RESULT_OK
                    scope.launch { reportResult(smsId, if (ok) "sent" else "failed", if (ok) null else "SmsManager RESULT $resultCode") }
                    try { unregisterReceiver(this) } catch (_: Exception) {}
                }
            }
            val deliveredReceiver = object : BroadcastReceiver() {
                override fun onReceive(ctx: Context?, intent: Intent?) {
                    val ok = resultCode == android.app.Activity.RESULT_OK
                    if (ok) scope.launch { reportResult(smsId, "delivered", null) }
                    try { unregisterReceiver(this) } catch (_: Exception) {}
                }
            }
            registerReceiver(sentReceiver, IntentFilter(sentAction))
            registerReceiver(deliveredReceiver, IntentFilter(deliveredAction))

            if (parts.size <= 1) smsManager.sendTextMessage(to, null, body, sentPI, deliveredPI)
            else {
                val sentList = ArrayList(parts.map { sentPI }); val deliveredList = ArrayList(parts.map { deliveredPI })
                smsManager.sendMultipartTextMessage(to, null, parts, sentList, deliveredList)
            }
        } catch (e: Exception) {
            scope.launch { reportResult(smsId, "failed", e.message) }
        }
    }

    private suspend fun reportResult(smsId: String, status: String, error: String?) {
        try {
            val url = serverUrl(); val token = gatewayToken()
            val payload = JSONObject().put("smsId", smsId).put("status", status)
            if (error != null) payload.put("error", error)
            val req = Request.Builder().url("$url/api/sms/gateway/result").header("x-gateway-token", token).post(payload.toString().toRequestBody(jsonType)).build()
            withContext(Dispatchers.IO) { client.newCall(req).execute().close() }
        } catch (_: Exception) {}
    }

    private suspend fun heartbeat() {
        try {
            val url = serverUrl(); val token = gatewayToken()
            val req = Request.Builder().url("$url/api/sms/gateway/heartbeat").header("x-gateway-token", token).post("{}".toRequestBody(jsonType)).build()
            withContext(Dispatchers.IO) { client.newCall(req).execute().close() }
        } catch (_: Exception) {}
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel("gateway", "Gateway", NotificationManager.IMPORTANCE_LOW)
            (getSystemService(NotificationManager::class.java)).createNotificationChannel(ch)
        }
    }
    private fun notification(text: String): Notification = NotificationCompat.Builder(this, "gateway").setContentTitle(text).setSmallIcon(android.R.drawable.stat_sys_upload).setOngoing(true).build()
}
