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
 * media-playback foreground service (BackgroundAudioService) keeps the app awake and shows a
 * notification with play / pause and stop. The audio itself stays in the WebView (src/lib/audioPlayback.ts).
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

    /** Notification button pressed: tell the web layer ("toggle" or "stop"). */
    static void emit(String action) {
        BackgroundAudioPlugin p = instance;
        if (p == null) return;
        JSObject data = new JSObject();
        data.put("action", action);
        p.notifyListeners("action", data);
    }

    @PluginMethod
    public void update(PluginCall call) {
        String title = call.getString("title", "");
        String artist = call.getString("artist", "");
        boolean playing = Boolean.TRUE.equals(call.getBoolean("playing", true));
        Context ctx = getContext();

        BackgroundAudioService running = BackgroundAudioService.instance;
        if (running != null) {
            running.update(title, artist, playing);
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
        intent.putExtra("playing", true);
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
