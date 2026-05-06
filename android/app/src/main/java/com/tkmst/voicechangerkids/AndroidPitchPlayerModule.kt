@file:Suppress("DEPRECATION")

package com.tkmst.voicechangerkids

import android.net.Uri
import com.google.android.exoplayer2.MediaItem
import com.google.android.exoplayer2.PlaybackException
import com.google.android.exoplayer2.PlaybackParameters
import com.google.android.exoplayer2.Player
import com.google.android.exoplayer2.SimpleExoPlayer
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class AndroidPitchPlayerModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  private var player: SimpleExoPlayer? = null

  override fun getName(): String = "AndroidPitchPlayer"

  @ReactMethod
  fun play(uri: String, pitch: Double, promise: Promise) {
    try {
      stopCurrentPlayer()

      val exoPlayer = SimpleExoPlayer.Builder(reactContext).build()
      player = exoPlayer

      exoPlayer.addListener(object : Player.Listener {
        override fun onPlaybackStateChanged(playbackState: Int) {
          if (playbackState == Player.STATE_ENDED) {
            stopCurrentPlayer()
            sendEvent("AndroidPitchPlayerFinished")
          }
        }

        override fun onPlayerError(error: PlaybackException) {
          stopCurrentPlayer()
          sendEvent("AndroidPitchPlayerError")
        }
      })

      exoPlayer.setMediaItem(MediaItem.fromUri(Uri.parse(uri)))
      exoPlayer.playbackParameters = PlaybackParameters(1.0f, pitch.toFloat())
      exoPlayer.prepare()
      exoPlayer.play()

      promise.resolve(null)
    } catch (error: Exception) {
      stopCurrentPlayer()
      promise.reject("PITCH_PLAYBACK_FAILED", "Failed to play audio with pitch shift.", error)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    try {
      stopCurrentPlayer()
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("PITCH_STOP_FAILED", "Failed to stop pitch playback.", error)
    }
  }

  @ReactMethod
  fun addListener(eventName: String) {
    // Required by NativeEventEmitter.
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required by NativeEventEmitter.
  }

  private fun stopCurrentPlayer() {
    player?.let { exoPlayer ->
      exoPlayer.stop()
      exoPlayer.release()
    }
    player = null
  }

  private fun sendEvent(eventName: String) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, null)
  }
}
