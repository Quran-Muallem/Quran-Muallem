package quran.muallem;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Keeps Sheikh recitations playing with the screen off: while the WebView plays a recitation, a
 * media-playback foreground service (BackgroundAudioService) keeps the app awake (wake + Wi-Fi lock) and
 * runs a MediaSession — lock-screen player with surah, Sheikh, artwork, progress, play / pause,
 * previous / next and seek. The audio itself stays in the WebView (src/lib/audioPlayback.ts).
 * Installed into the generated android/ project by scripts/native-permissions.mjs.
 */
@CapacitorPlugin(name = "BackgroundAudio")
public class BackgroundAudioPlugin extends Plugin {
    private static BackgroundAudioPlugin instance;
    private boolean askedForNotifications = false;

    @Override
    public void load() {
        instance = this;
    }

    /** Lock screen / notification / headset button: tell the web layer (play, pause, next, previous, stop, seekto). */
    static void emit(String action, double seconds) {
        BackgroundAudioPlugin p = instance;
        if (p == null) return;
        JSObject data = new JSObject();
        data.put("action", action);
        if (seconds >= 0) data.put("seekTime", seconds);
        p.notifyListeners("action", data, true);
    }

    @PluginMethod
    public void update(PluginCall call) {
        String title = call.getString("title", "");
        String artist = call.getString("artist", "");
        String album = call.getString("album", "");
        boolean playing = Boolean.TRUE.equals(call.getBoolean("playing", true));
        long position = Math.round(1000 * call.getDouble("position", 0.0));
        long duration = Math.round(1000 * call.getDouble("duration", 0.0));
        boolean canPrev = Boolean.TRUE.equals(call.getBoolean("canPrev", true));
        boolean canNext = Boolean.TRUE.equals(call.getBoolean("canNext", true));
        Context ctx = getContext();

        BackgroundAudioService running = BackgroundAudioService.instance;
        if (running != null) {
            running.update(title, artist, album, playing, position, duration, canPrev, canNext);
            call.resolve();
            return;
        }
        if (!playing) {
            call.resolve();
            return;
        }
        // Android 13+: the notification needs the user's permission (the service runs either way).
        if (Build.VERSION.SDK_INT >= 33 && !askedForNotifications && getActivity() != null
                && ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            askedForNotifications = true;
            ActivityCompat.requestPermissions(getActivity(), new String[] { Manifest.permission.POST_NOTIFICATIONS }, 7302);
        }
        Intent intent = new Intent(ctx, BackgroundAudioService.class);
        intent.putExtra("title", title);
        intent.putExtra("artist", artist);
        intent.putExtra("album", album);
        intent.putExtra("playing", true);
        intent.putExtra("position", position);
        intent.putExtra("duration", duration);
        intent.putExtra("canPrev", canPrev);
        intent.putExtra("canNext", canNext);
        try {
            ContextCompat.startForegroundService(ctx, intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not start background audio: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), BackgroundAudioService.class));
        call.resolve();
    }
}
