package com.freemailsend.gateway

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Auto-starts the gateway after a device reboot (TextBee pattern, manifest-mirrored:
 * exported=true guarded by RECEIVE_BOOT_COMPLETED). Only starts when a server URL
 * has been configured — a factory-reset phone stays dormant.
 */
class BootCompletedReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        val prefs = ctx.getSharedPreferences("gateway", Context.MODE_PRIVATE)
        if (prefs.getString("serverUrl", "").isNullOrBlank()) return
        if (!prefs.getBoolean("autoStartOnBoot", true)) return
        try {
            ctx.startForegroundService(Intent(ctx, GatewayService::class.java))
        } catch (_: Exception) {
            // FGS background-start can throw if the OS restricts it; user can still start manually.
        }
    }
}
