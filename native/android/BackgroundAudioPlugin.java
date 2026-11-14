package quran.muallem;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.os.Build;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;


import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
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
 *
 * v29 additions:
 *  - `download`: surah files of the reciters library are fetched natively (HttpURLConnection on a worker
 *    thread, redirects across http/https followed, 15 s connect / 25 s read timeout) straight into the app's
 *    files folder, with "download" progress events {id, received, total} — the WebView / file-transfer path
 *    could hang at «0.0 MB» on some phones.
 *  - `playerLoad` / `playerControl` / `playerMarks`: the reciters library plays natively (MediaPlayer inside
 *    the foreground service), so a surah keeps playing when the app is minimised or the screen is off;
 *    "player" events report state and position back to the web layer.
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

    /** v45 hands-free: headset / AirPods / car button → web layer ("handsfree" event: play, pause, toggle, repeat). */
    static void emitHandsFree(String action) {
        BackgroundAudioPlugin p = instance;
        if (p == null) return;
        JSObject data = new JSObject();
        data.put("action", action);
        p.notifyListeners("handsfree", data, true);
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

    /** Native player state → web layer (state, index, position, duration in seconds). */
    static void emitPlayer(String state, int index, double position, double duration) {
        BackgroundAudioPlugin p = instance;
        if (p == null) return;
        JSObject data = new JSObject();
        data.put("state", state);
        data.put("index", index);
        data.put("position", position);
        data.put("duration", duration);
        p.notifyListeners("player", data, true);
    }

    /* ───────────── native downloads ───────────── */

    private final ExecutorService downloads = Executors.newFixedThreadPool(3);
    private final Map<String, Boolean> cancelled = new ConcurrentHashMap<>();

    @PluginMethod
    public void download(PluginCall call) {
        final String id = call.getString("id", "");
        final String url = call.getString("url", "");
        final String path = call.getString("path", "");
        if (url.isEmpty() || path.isEmpty() || path.contains("..")) { call.reject("bad arguments"); return; }
        final File target = new File(getContext().getFilesDir(), path);
        cancelled.remove(id);
        downloads.execute(() -> {
            File part = new File(target.getPath() + ".part");
            HttpURLConnection conn = null;
            try {
                File dir = target.getParentFile();
                if (dir != null && !dir.exists() && !dir.mkdirs() && !dir.exists()) throw new Exception("cannot create folder");
                conn = open(url, 0);
                long total = conn.getContentLength();
                long received = 0, lastEmit = 0;
                try (InputStream in = conn.getInputStream(); OutputStream out = new FileOutputStream(part)) {
                    byte[] buf = new byte[64 * 1024];
                    int n;
                    emitDownload(id, 0, total);
                    while ((n = in.read(buf)) != -1) {
                        if (Boolean.TRUE.equals(cancelled.get(id))) throw new InterruptedException("cancelled");
                        out.write(buf, 0, n);
                        received += n;
                        long now = System.currentTimeMillis();
                        if (now - lastEmit > 250) { lastEmit = now; emitDownload(id, received, total); }
                    }
                }
                if (received == 0) throw new Exception("empty download");
                if (total > 0 && received < total) throw new Exception("incomplete download");
                if (target.exists() && !target.delete()) throw new Exception("cannot replace file");
                if (!part.renameTo(target)) throw new Exception("cannot save file");
                emitDownload(id, received, total > 0 ? total : received);
                JSObject res = new JSObject();
                res.put("bytes", received);
                call.resolve(res);
            } catch (InterruptedException e) {
                part.delete();
                call.reject("cancelled");
            } catch (Exception e) {
                part.delete();
                call.reject(e.getMessage() != null ? e.getMessage() : "download failed");
            } finally {
                if (conn != null) conn.disconnect();
                cancelled.remove(id);
            }
        });
    }

    /** Opens the URL; follows up to 5 redirects, also between http and https (HttpURLConnection does not). */
    private static HttpURLConnection open(String url, int hops) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(25000);
        c.setInstanceFollowRedirects(true);
        c.setRequestProperty("User-Agent", "QuranMuallem/1.8 (Android)");
        int code = c.getResponseCode();
        if (code >= 300 && code < 400 && hops < 5) {
            String next = c.getHeaderField("Location");
            c.disconnect();
            if (next == null) throw new Exception("HTTP " + code);
            return open(new URL(new URL(url), next).toString(), hops + 1);
        }
        if (code != 200) { c.disconnect(); throw new Exception("HTTP " + code); }
        return c;
    }

    private void emitDownload(String id, long received, long total) {
        JSObject data = new JSObject();
        data.put("id", id);
        data.put("received", received);
        data.put("total", Math.max(0, total));
        notifyListeners("download", data, false);
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) {
        cancelled.put(call.getString("id", ""), Boolean.TRUE);
        call.resolve();
    }

    /* ───────────── native player (reciters library) ───────────── */

    @PluginMethod
    public void playerLoad(PluginCall call) {
        JSArray items = call.getArray("items");
        if (items == null || items.length() == 0) { call.reject("no items"); return; }
        int index = call.getInt("index", 0);
        long startMs = Math.round(call.getDouble("startMs", 0.0));
        BackgroundAudioService.pendingLoad = new BackgroundAudioService.Load(items.toString(), index, startMs);
        BackgroundAudioService running = BackgroundAudioService.instance;
        if (running != null) { running.takePendingLoad(); call.resolve(); return; }
        Context ctx = getContext();
        if (Build.VERSION.SDK_INT >= 33 && !askedForNotifications && getActivity() != null
                && ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            askedForNotifications = true;
            ActivityCompat.requestPermissions(getActivity(), new String[] { Manifest.permission.POST_NOTIFICATIONS }, 7302);
        }
        try {
            ContextCompat.startForegroundService(ctx, new Intent(ctx, BackgroundAudioService.class).setAction(BackgroundAudioService.ACTION_LOAD));
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not start the player: " + e.getMessage());
        }
    }

    @PluginMethod
    public void playerControl(PluginCall call) {
        String action = call.getString("action", "");
        if ("rate".equals(action)) BackgroundAudioService.rate = (float) (call.getDouble("ms", 1000.0) / 1000.0);
        BackgroundAudioService s = BackgroundAudioService.instance;
        if (s == null) { call.resolve(); return; }
        s.control(action, Math.round(call.getDouble("ms", 0.0)), call.getInt("index", -1));
        call.resolve();
    }

    @PluginMethod
    public void playerMarks(PluginCall call) {
        BackgroundAudioService s = BackgroundAudioService.instance;
        JSArray marks = call.getArray("marks");
        if (s != null && marks != null) {
            long[] m = new long[marks.length()];
            for (int i = 0; i < m.length; i++) m[i] = marks.optLong(i);
            s.setMarks(call.getInt("index", -1), m);
        }
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), BackgroundAudioService.class));
        call.resolve();
    }

    /* ───────────── v45: hands-free Hifdh (microphone service, audio routing) ───────────── */

    @PluginMethod
    public void startHandsFree(PluginCall call) {
        Context ctx = getContext();
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            call.reject("microphone permission missing");
            return;
        }
        if (Build.VERSION.SDK_INT >= 33 && !askedForNotifications && getActivity() != null
                && ContextCompat.checkSelfPermission(ctx, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            askedForNotifications = true;
            ActivityCompat.requestPermissions(getActivity(), new String[] { Manifest.permission.POST_NOTIFICATIONS }, 7302);
        }
        Intent i = new Intent(ctx, HandsFreeMicService.class)
                .putExtra(HandsFreeMicService.EXTRA_TITLE, call.getString("title", "Quran Muallem"))
                .putExtra(HandsFreeMicService.EXTRA_TEXT, call.getString("text", "المراجعة الحرة نشطة - في انتظار التلاوة"));
        try {
            ContextCompat.startForegroundService(ctx, i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not start the microphone service: " + e.getMessage());
        }
    }

    @PluginMethod
    public void updateHandsFree(PluginCall call) {
        HandsFreeMicService s = HandsFreeMicService.instance;
        if (s != null) s.update(call.getString("title"), call.getString("text"));
        call.resolve();
    }

    @PluginMethod
    public void stopHandsFree(PluginCall call) {
        getContext().stopService(new Intent(getContext(), HandsFreeMicService.class));
        call.resolve();
    }

    private static String deviceKind(int type) {
        switch (type) {
            case AudioDeviceInfo.TYPE_BLUETOOTH_SCO: case AudioDeviceInfo.TYPE_BLUETOOTH_A2DP: return "bluetooth";
            case AudioDeviceInfo.TYPE_WIRED_HEADSET: case AudioDeviceInfo.TYPE_WIRED_HEADPHONES: case AudioDeviceInfo.TYPE_USB_HEADSET: return "wired";
            case AudioDeviceInfo.TYPE_BUILTIN_SPEAKER: case AudioDeviceInfo.TYPE_BUILTIN_EARPIECE: case AudioDeviceInfo.TYPE_BUILTIN_MIC: return "phone";
            default:
                if (Build.VERSION.SDK_INT >= 31 && (type == AudioDeviceInfo.TYPE_BLE_HEADSET || type == AudioDeviceInfo.TYPE_BLE_SPEAKER)) return "bluetooth";
                return "other";
        }
    }

    /** Connected audio devices: [{kind: bluetooth | wired | phone | other, name, input, output}]. */
    @PluginMethod
    public void audioDevices(PluginCall call) {
        AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        JSArray list = new JSArray();
        if (am != null) {
            for (AudioDeviceInfo d : am.getDevices(AudioManager.GET_DEVICES_ALL)) {
                JSObject o = new JSObject();
                o.put("kind", deviceKind(d.getType()));
                o.put("name", d.getProductName() == null ? "" : d.getProductName().toString());
                o.put("input", d.isSource());
                o.put("output", d.isSink());
                list.put(o);
            }
        }
        JSObject res = new JSObject();
        res.put("devices", list);
        call.resolve(res);
    }

    /**
     * «سماعة البلوتوث / مكبر الصوت / تلقائي»: route the microphone (and the voice path) to the Bluetooth headset
     * (headset / car microphone), to the phone, or leave it to the system. Media output follows the system
     * (A2DP to Bluetooth when connected).
     */
    @PluginMethod
    public void setAudioRoute(PluginCall call) {
        String route = call.getString("route", "auto");
        AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (am == null) { call.reject("no audio manager"); return; }
        boolean ok = true;
        try {
            if ("bluetooth".equals(route)) {
                am.setMode(AudioManager.MODE_IN_COMMUNICATION);
                if (Build.VERSION.SDK_INT >= 31) {
                    AudioDeviceInfo bt = null;
                    for (AudioDeviceInfo d : am.getAvailableCommunicationDevices()) if ("bluetooth".equals(deviceKind(d.getType()))) { bt = d; break; }
                    ok = bt != null && am.setCommunicationDevice(bt);
                } else {
                    am.startBluetoothSco();
                    am.setBluetoothScoOn(true);
                }
                if (!ok) am.setMode(AudioManager.MODE_NORMAL);
            } else if ("speaker".equals(route)) {
                if (Build.VERSION.SDK_INT >= 31) am.clearCommunicationDevice(); else { am.stopBluetoothSco(); am.setBluetoothScoOn(false); }
                am.setMode(AudioManager.MODE_NORMAL);
                am.setSpeakerphoneOn(true);
            } else {
                if (Build.VERSION.SDK_INT >= 31) am.clearCommunicationDevice(); else { am.stopBluetoothSco(); am.setBluetoothScoOn(false); }
                am.setSpeakerphoneOn(false);
                am.setMode(AudioManager.MODE_NORMAL);
            }
        } catch (Exception e) {
            ok = false;
        }
        JSObject res = new JSObject();
        res.put("ok", ok);
        res.put("route", route);
        call.resolve(res);
    }
}
