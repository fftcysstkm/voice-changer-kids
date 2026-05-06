const fs = require('fs');
const path = require('path');
const { withDangerousMod, withMainApplication } = require('@expo/config-plugins');

const MODULE_NAME = 'AndroidPitchPlayerModule.kt';
const PACKAGE_NAME = 'AndroidPitchPlayerPackage.kt';

const moduleSource = `package com.tkmst.voicechangerkids

import android.media.MediaPlayer
import android.media.PlaybackParams
import android.net.Uri
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class AndroidPitchPlayerModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  private var mediaPlayer: MediaPlayer? = null

  override fun getName(): String = "AndroidPitchPlayer"

  @ReactMethod
  fun play(uri: String, pitch: Double, promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
      promise.reject("UNSUPPORTED_ANDROID_VERSION", "Pitch playback requires Android 6.0 or newer.")
      return
    }

    try {
      stopCurrentPlayer()

      val player = MediaPlayer()
      mediaPlayer = player

      player.setDataSource(reactContext, Uri.parse(uri))
      player.setOnCompletionListener {
        stopCurrentPlayer()
        sendEvent("AndroidPitchPlayerFinished")
      }
      player.setOnErrorListener { _, _, _ ->
        stopCurrentPlayer()
        sendEvent("AndroidPitchPlayerError")
        true
      }
      player.prepare()
      player.playbackParams = PlaybackParams()
        .setSpeed(1.0f)
        .setPitch(pitch.toFloat())
      player.start()

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
    mediaPlayer?.let { player ->
      try {
        if (player.isPlaying) {
          player.stop()
        }
      } finally {
        player.reset()
        player.release()
      }
    }
    mediaPlayer = null
  }

  private fun sendEvent(eventName: String) {
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, null)
  }
}
`;

const packageSource = `package com.tkmst.voicechangerkids

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

@Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
class AndroidPitchPlayerPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(AndroidPitchPlayerModule(reactContext))

  override fun createViewManagers(
    reactContext: ReactApplicationContext
  ): List<ViewManager<*, *>> = emptyList()
}
`;

function addAndroidPitchPlayerPackage(contents) {
  if (contents.includes('add(AndroidPitchPlayerPackage())')) {
    return contents;
  }

  return contents.replace(
    '// add(MyReactNativePackage())',
    '// add(MyReactNativePackage())\n              add(AndroidPitchPlayerPackage())',
  );
}

module.exports = function withAndroidPitchPlayer(config) {
  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const packagePath = path.join(
        modConfig.modRequest.platformProjectRoot,
        'app/src/main/java/com/tkmst/voicechangerkids',
      );

      fs.mkdirSync(packagePath, { recursive: true });
      fs.writeFileSync(path.join(packagePath, MODULE_NAME), moduleSource);
      fs.writeFileSync(path.join(packagePath, PACKAGE_NAME), packageSource);

      return modConfig;
    },
  ]);

  return withMainApplication(config, (modConfig) => {
    modConfig.modResults.contents = addAndroidPitchPlayerPackage(modConfig.modResults.contents);
    return modConfig;
  });
};
