package quran.muallem;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.SystemClock;

import androidx.core.app.ServiceCompat;

import java.io.InputStream;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Media-playback foreground service while a Sheikh recitation plays (see BackgroundAudioPlugin).
 *
 *  - A real android.media.session.MediaSession: lock screen / notification shade / Bluetooth / car show the
 *    surah, «بصوت الشيخ …», the artwork and a seekable progress bar, with play / pause, previous / next and
 *    seek. Button presses go back to the web layer (BackgroundAudioPlugin.emit).
 *  - Partial wake lock + Wi-Fi lock while playing, so the CPU and the stream keep feeding the WebView's
 *    audio with the screen off (renewed with every update from the web layer).
 *  - v29 native player (reciters library): an android.media.MediaPlayer inside this service plays the surah
 *    files (stream or downloaded file) one after another — independent of the WebView, so minimising the app
 *    or locking the screen never stops it. Lock-screen buttons then act here directly (next / previous verse
 *    by the verse marks, else surah) and the web layer is told through "player" events.
 * Framework classes only (MediaSession, Notification.MediaStyle, MediaPlayer) — no extra Gradle dependency.
 */
public class BackgroundAudioService extends Service {
    static volatile BackgroundAudioService instance;

    private static final String CHANNEL_ID = "recitation";
    private static final int NOTIFICATION_ID = 7301;
    static final String ACTION_PLAY = "quran.muallem.audio.PLAY";
    static final String ACTION_PAUSE = "quran.muallem.audio.PAUSE";
    static final String ACTION_NEXT = "quran.muallem.audio.NEXT";
    static final String ACTION_PREV = "quran.muallem.audio.PREV";
    static final String ACTION_STOP = "quran.muallem.audio.STOP";
    static final String ACTION_LOAD = "quran.muallem.audio.LOAD";

    /** A playlist handed over by the plugin before / while the service starts. */
    static final class Load {
        final String items; final int index; final long startMs;
        Load(String items, int index, long startMs) { this.items = items; this.index = index; this.startMs = startMs; }
    }
    static volatile Load pendingLoad;

    // Native player state.
    private MediaPlayer player;
    private JSONArray items;
    private int index = 0;
    private long[] marks = new long[0];
    private boolean nativeMode = false;
    private boolean preparing = false;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private int ticks = 0;
    private final Runnable tick = new Runnable() {
        @Override public void run() {
            if (player != null && nativeMode) {
                try {
                    if (player.isPlaying()) {
                        positionMs = player.getCurrentPosition();
                        BackgroundAudioPlugin.emitPlayer("playing", index, positionMs / 1000.0, durationMs / 1000.0);
                        if (++ticks % 5 == 0) { applySession(); holdLocks(true); }
                    }
                } catch (IllegalStateException ignored) { }
                handler.postDelayed(this, 1000);
            }
        }
    };

    private PowerManager.WakeLock wakeLock;
    private WifiManager.WifiLock wifiLock;
    private MediaSession session;
    private Bitmap artwork;
    private String title = "";
    private String artist = "";
    private String album = "";
    private boolean playing = true;
    private long positionMs = 0;
    private long durationMs = 0;
    private boolean canPrev = true;
    private boolean canNext = true;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && nm.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "Recitation", NotificationManager.IMPORTANCE_LOW);
                ch.setShowBadge(false);
                ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                nm.createNotificationChannel(ch);
            }
        }
        artwork = loadArtwork();
        session = new MediaSession(this, "QuranMuallem");
        session.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { if (nativeMode) control("resume", 0, -1); else BackgroundAudioPlugin.emit("play", -1); }
            @Override public void onPause() { if (nativeMode) control("pause", 0, -1); else BackgroundAudioPlugin.emit("pause", -1); }
            @Override public void onSkipToNext() { if (nativeMode) control("next", 0, -1); else BackgroundAudioPlugin.emit("next", -1); }
            @Override public void onSkipToPrevious() { if (nativeMode) control("previous", 0, -1); else BackgroundAudioPlugin.emit("previous", -1); }
            @Override public void onStop() { if (nativeMode) control("stop", 0, -1); else BackgroundAudioPlugin.emit("stop", -1); }
            @Override public void onSeekTo(long pos) { if (nativeMode) control("seek", pos, -1); else BackgroundAudioPlugin.emit("seekto", pos / 1000.0); }
        });
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (open != null) session.setSessionActivity(PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        session.setActive(true);
    }

    /** The app icon from the web assets (public/icon-512.png) as lock-screen artwork. */
    private Bitmap loadArtwork() {
        String[] candidates = { "public/icon-512.png", "public/icon-192.png" };
        for (String path : candidates) {
            try (InputStream in = getAssets().open(path)) {
                Bitmap b = BitmapFactory.decodeStream(in);
                if (b != null) return b;
            } catch (Exception ignored) { }
        }
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (ACTION_PLAY.equals(action)) { if (nativeMode) control("resume", 0, -1); else BackgroundAudioPlugin.emit("play", -1); return START_NOT_STICKY; }
        if (ACTION_PAUSE.equals(action)) { if (nativeMode) control("pause", 0, -1); else BackgroundAudioPlugin.emit("pause", -1); return START_NOT_STICKY; }
        if (ACTION_NEXT.equals(action)) { if (nativeMode) control("next", 0, -1); else BackgroundAudioPlugin.emit("next", -1); return START_NOT_STICKY; }
        if (ACTION_PREV.equals(action)) { if (nativeMode) control("previous", 0, -1); else BackgroundAudioPlugin.emit("previous", -1); return START_NOT_STICKY; }
        if (ACTION_STOP.equals(action)) { if (nativeMode) control("stop", 0, -1); else BackgroundAudioPlugin.emit("stop", -1); return START_NOT_STICKY; }
        if (ACTION_LOAD.equals(action)) {
            int type = Build.VERSION.SDK_INT >= 29 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0;
            ServiceCompat.startForeground(this, NOTIFICATION_ID, buildNotification(), type);
            takePendingLoad();
            return START_NOT_STICKY;
        }
        if (intent != null) readExtras(intent);
        int type = Build.VERSION.SDK_INT >= 29 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0;
        applySession();
        ServiceCompat.startForeground(this, NOTIFICATION_ID, buildNotification(), type);
        holdLocks(playing);
        return START_NOT_STICKY;
    }

    private void readExtras(Intent i) {
        title = valueOr(i.getStringExtra("title"), title);
        artist = valueOr(i.getStringExtra("artist"), artist);
        album = valueOr(i.getStringExtra("album"), album);
        playing = i.getBooleanExtra("playing", true);
        positionMs = i.getLongExtra("position", 0);
        durationMs = i.getLongExtra("duration", 0);
        canPrev = i.getBooleanExtra("canPrev", true);
        canNext = i.getBooleanExtra("canNext", true);
    }

    /* ───────────── native player ───────────── */

    /** Starts the playlist the plugin left in `pendingLoad`. */
    void takePendingLoad() {
        Load l = pendingLoad;
        pendingLoad = null;
        if (l == null) return;
        try { items = new JSONArray(l.items); } catch (Exception e) { return; }
        nativeMode = true;
        marks = new long[0];
        prepare(Math.max(0, Math.min(items.length() - 1, l.index)), l.startMs);
    }

    private void prepare(int i, long startMs) {
        releasePlayer();
        index = i;
        JSONObject item = items.optJSONObject(i);
        if (item == null) { finishPlaylist(); return; }
        title = valueOr(item.optString("title"), title);
        artist = valueOr(item.optString("artist"), artist);
        album = valueOr(item.optString("album"), album);
        positionMs = startMs; durationMs = 0; playing = true;
        canPrev = true; canNext = true;
        applySession();
        notifyNow();
        holdLocks(true);
        BackgroundAudioPlugin.emitPlayer("loading", index, startMs / 1000.0, 0);
        final MediaPlayer mp = new MediaPlayer();
        player = mp;
        preparing = true;
        try {
            mp.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
            mp.setWakeMode(getApplicationContext(), PowerManager.PARTIAL_WAKE_LOCK);
            mp.setDataSource(this, Uri.parse(item.optString("url")));
            mp.setOnPreparedListener(p -> {
                if (player != p) return;
                preparing = false;
                durationMs = Math.max(0, p.getDuration());
                if (startMs > 0) p.seekTo((int) startMs);
                if (requestFocus()) { p.start(); playing = true; } else playing = false;
                applySession(); notifyNow();
                BackgroundAudioPlugin.emitPlayer(playing ? "playing" : "paused", index, startMs / 1000.0, durationMs / 1000.0);
                handler.removeCallbacks(tick);
                handler.postDelayed(tick, 1000);
            });
            mp.setOnCompletionListener(p -> { if (player == p) next(true); });
            mp.setOnErrorListener((p, what, extra) -> {
                if (player != p) return true;
                playing = false; preparing = false;
                applySession(); notifyNow();
                BackgroundAudioPlugin.emitPlayer("error", index, positionMs / 1000.0, durationMs / 1000.0);
                return true;
            });
            mp.prepareAsync();
        } catch (Exception e) {
            preparing = false; playing = false;
            BackgroundAudioPlugin.emitPlayer("error", index, 0, 0);
        }
    }

    private void next(boolean auto) {
        if (items != null && index + 1 < items.length()) { marks = new long[0]; prepare(index + 1, 0); return; }
        if (auto) finishPlaylist();
    }

    private void finishPlaylist() {
        releasePlayer();
        playing = false;
        BackgroundAudioPlugin.emitPlayer("ended", index, 0, 0);
        nativeMode = false;
        stopSelf();
    }

    private void releasePlayer() {
        handler.removeCallbacks(tick);
        if (player != null) {
            MediaPlayer p = player;
            player = null;
            try { p.reset(); } catch (Exception ignored) { }
            try { p.release(); } catch (Exception ignored) { }
        }
    }

    private boolean requestFocus() {
        if (audioManager == null) audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (audioManager == null) return true;
        AudioManager.OnAudioFocusChangeListener l = change -> {
            if (!nativeMode || player == null) return;
            if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) control("pause", 0, -1);
        };
        if (Build.VERSION.SDK_INT >= 26) {
            focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
                    .setOnAudioFocusChangeListener(l).build();
            return audioManager.requestAudioFocus(focusRequest) != AudioManager.AUDIOFOCUS_REQUEST_FAILED;
        }
        return audioManager.requestAudioFocus(l, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN) != AudioManager.AUDIOFOCUS_REQUEST_FAILED;
    }

    /** Verse starts (ms) inside item `i`, for previous / next verse on the lock screen. */
    void setMarks(int i, long[] m) { if (i == index) marks = m; }

    /** pause | resume | stop | seek (ms) | next | previous | index (jump to item). */
    void control(String action, long ms, int i) {
        if (!nativeMode) return;
        MediaPlayer p = player;
        switch (action) {
            case "pause":
                if (p != null && !preparing && p.isPlaying()) { p.pause(); positionMs = p.getCurrentPosition(); }
                playing = false;
                break;
            case "resume":
                if (p != null && !preparing && requestFocus()) { p.start(); playing = true; handler.removeCallbacks(tick); handler.postDelayed(tick, 1000); }
                else if (p == null && items != null) { prepare(index, positionMs); return; }
                break;
            case "seek":
                if (p != null && !preparing) { p.seekTo((int) Math.max(0, ms)); positionMs = ms; }
                break;
            case "next": {
                long pos = p != null && !preparing ? p.getCurrentPosition() : 0;
                for (long m : marks) if (m > pos + 300) { if (p != null) p.seekTo((int) m); positionMs = m; applySession(); notifyNow(); emitState(); return; }
                next(false);
                return;
            }
            case "previous": {
                long pos = p != null && !preparing ? p.getCurrentPosition() : 0;
                long target = -1;
                for (long m : marks) if (m < pos - 2500) target = m;
                if (target >= 0 && p != null) { p.seekTo((int) target); positionMs = target; applySession(); notifyNow(); emitState(); return; }
                if (pos > 3000 && p != null) { p.seekTo(0); positionMs = 0; applySession(); notifyNow(); emitState(); return; }
                if (index > 0) { marks = new long[0]; prepare(index - 1, 0); }
                return;
            }
            case "index":
                if (items != null && i >= 0 && i < items.length()) { marks = new long[0]; prepare(i, ms); }
                return;
            case "stop":
                releasePlayer();
                playing = false;
                BackgroundAudioPlugin.emitPlayer("stopped", index, positionMs / 1000.0, durationMs / 1000.0);
                nativeMode = false;
                stopSelf();
                return;
            default:
                return;
        }
        applySession();
        notifyNow();
        holdLocks(playing);
        emitState();
    }

    private void emitState() {
        BackgroundAudioPlugin.emitPlayer(preparing ? "loading" : playing ? "playing" : "paused", index, positionMs / 1000.0, durationMs / 1000.0);
    }

    private void notifyNow() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIFICATION_ID, buildNotification());
    }

    /** New verse / play / pause / position from the web layer while the service runs. */
    void update(String newTitle, String newArtist, String newAlbum, boolean isPlaying, long position, long duration, boolean prev, boolean next) {
        // Another player of the app (the Mushaf's verse player) took over: the native playlist ends.
        if (nativeMode && isPlaying) { releasePlayer(); nativeMode = false; BackgroundAudioPlugin.emitPlayer("stopped", index, positionMs / 1000.0, durationMs / 1000.0); }
        title = valueOr(newTitle, title);
        artist = valueOr(newArtist, artist);
        album = valueOr(newAlbum, album);
        playing = isPlaying;
        positionMs = Math.max(0, position);
        durationMs = Math.max(0, duration);
        canPrev = prev;
        canNext = next;
        applySession();
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIFICATION_ID, buildNotification());
        holdLocks(playing);
    }

    private void applySession() {
        if (session == null) return;
        MediaMetadata.Builder m = new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, title)
                .putString(MediaMetadata.METADATA_KEY_DISPLAY_TITLE, title)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, artist)
                .putString(MediaMetadata.METADATA_KEY_DISPLAY_SUBTITLE, artist)
                .putString(MediaMetadata.METADATA_KEY_ALBUM, album);
        if (durationMs > 0) m.putLong(MediaMetadata.METADATA_KEY_DURATION, durationMs);
        if (artwork != null) {
            m.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, artwork);
            m.putBitmap(MediaMetadata.METADATA_KEY_ART, artwork);
        }
        session.setMetadata(m.build());
        long actions = PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_PLAY_PAUSE
                | PlaybackState.ACTION_STOP | PlaybackState.ACTION_SEEK_TO;
        if (canPrev) actions |= PlaybackState.ACTION_SKIP_TO_PREVIOUS;
        if (canNext) actions |= PlaybackState.ACTION_SKIP_TO_NEXT;
        session.setPlaybackState(new PlaybackState.Builder()
                .setActions(actions)
                .setState(playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED, positionMs, playing ? 1f : 0f, SystemClock.elapsedRealtime())
                .build());
    }

    private PendingIntent serviceIntent(String action, int code) {
        return PendingIntent.getService(this, code, new Intent(this, BackgroundAudioService.class).setAction(action), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private Notification buildNotification() {
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CHANNEL_ID) : new Notification.Builder(this);
        int smallIcon = getApplicationInfo().icon != 0 ? getApplicationInfo().icon : android.R.drawable.ic_media_play;
        b.setSmallIcon(smallIcon)
                .setContentTitle(title)
                .setContentText(artist)
                .setSubText(album)
                .setOnlyAlertOnce(true)
                .setShowWhen(false)
                .setOngoing(playing)
                .setCategory(Notification.CATEGORY_TRANSPORT)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setDeleteIntent(serviceIntent(ACTION_STOP, 5));
        if (artwork != null) b.setLargeIcon(artwork);
        if (session != null && session.getController().getSessionActivity() != null) b.setContentIntent(session.getController().getSessionActivity());
        b.addAction(new Notification.Action.Builder(android.R.drawable.ic_media_previous, "Previous", serviceIntent(ACTION_PREV, 1)).build());
        b.addAction(playing
                ? new Notification.Action.Builder(android.R.drawable.ic_media_pause, "Pause", serviceIntent(ACTION_PAUSE, 2)).build()
                : new Notification.Action.Builder(android.R.drawable.ic_media_play, "Play", serviceIntent(ACTION_PLAY, 2)).build());
        b.addAction(new Notification.Action.Builder(android.R.drawable.ic_media_next, "Next", serviceIntent(ACTION_NEXT, 3)).build());
        Notification.MediaStyle style = new Notification.MediaStyle().setShowActionsInCompactView(0, 1, 2);
        if (session != null) style.setMediaSession(session.getSessionToken());
        b.setStyle(style);
        return b.build();
    }

    private void holdLocks(boolean on) {
        if (on) {
            if (wakeLock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "QuranMuallem:recitation");
                    wakeLock.setReferenceCounted(false);
                }
            }
            // Renewed with every update (verse change / position report every few seconds).
            if (wakeLock != null) wakeLock.acquire(10 * 60 * 1000L);
            if (wifiLock == null) {
                WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                if (wm != null) {
                    wifiLock = wm.createWifiLock(Build.VERSION.SDK_INT >= 29 ? WifiManager.WIFI_MODE_FULL_LOW_LATENCY : WifiManager.WIFI_MODE_FULL_HIGH_PERF, "QuranMuallem:stream");
                    wifiLock.setReferenceCounted(false);
                }
            }
            if (wifiLock != null && !wifiLock.isHeld()) wifiLock.acquire();
        } else {
            if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
            if (wifiLock != null && wifiLock.isHeld()) wifiLock.release();
        }
    }

    @Override
    public void onDestroy() {
        releasePlayer();
        if (audioManager != null) {
            if (Build.VERSION.SDK_INT >= 26 && focusRequest != null) audioManager.abandonAudioFocusRequest(focusRequest);
        }
        holdLocks(false);
        if (session != null) { session.setActive(false); session.release(); session = null; }
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        instance = null;
        super.onDestroy();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // The app was swiped away: the WebView (and its audio) is gone, so the controls go too — unless the
        // native player plays (it does not need the WebView).
        if (nativeMode && playing) { super.onTaskRemoved(rootIntent); return; }
        stopSelf();
        super.onTaskRemoved(rootIntent);
    }

    private static String valueOr(String v, String fallback) {
        return v == null || v.isEmpty() ? fallback : v;
    }
}
