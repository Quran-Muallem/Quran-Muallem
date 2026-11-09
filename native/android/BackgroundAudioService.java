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

/**
 * Media-playback foreground service while a Sheikh recitation plays (see BackgroundAudioPlugin).
 *
 *  - A real android.media.session.MediaSession: lock screen / notification shade / Bluetooth / car show the
 *    surah, «بصوت الشيخ …», the artwork and a seekable progress bar, with play / pause, previous / next and
 *    seek. Button presses go back to the web layer (BackgroundAudioPlugin.emit).
 *  - Partial wake lock + Wi-Fi lock while playing, so the CPU and the stream keep feeding the WebView's
 *    audio with the screen off (renewed with every update from the web layer).
 * Framework classes only (MediaSession, Notification.MediaStyle) — no extra Gradle dependency.
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
            @Override public void onPlay() { BackgroundAudioPlugin.emit("play", -1); }
            @Override public void onPause() { BackgroundAudioPlugin.emit("pause", -1); }
            @Override public void onSkipToNext() { BackgroundAudioPlugin.emit("next", -1); }
            @Override public void onSkipToPrevious() { BackgroundAudioPlugin.emit("previous", -1); }
            @Override public void onStop() { BackgroundAudioPlugin.emit("stop", -1); }
            @Override public void onSeekTo(long pos) { BackgroundAudioPlugin.emit("seekto", pos / 1000.0); }
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
        if (ACTION_PLAY.equals(action)) { BackgroundAudioPlugin.emit("play", -1); return START_NOT_STICKY; }
        if (ACTION_PAUSE.equals(action)) { BackgroundAudioPlugin.emit("pause", -1); return START_NOT_STICKY; }
        if (ACTION_NEXT.equals(action)) { BackgroundAudioPlugin.emit("next", -1); return START_NOT_STICKY; }
        if (ACTION_PREV.equals(action)) { BackgroundAudioPlugin.emit("previous", -1); return START_NOT_STICKY; }
        if (ACTION_STOP.equals(action)) { BackgroundAudioPlugin.emit("stop", -1); return START_NOT_STICKY; }
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

    /** New verse / play / pause / position from the web layer while the service runs. */
    void update(String newTitle, String newArtist, String newAlbum, boolean isPlaying, long position, long duration, boolean prev, boolean next) {
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
        holdLocks(false);
        if (session != null) { session.setActive(false); session.release(); session = null; }
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        instance = null;
        super.onDestroy();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // The app was swiped away: the WebView (and its audio) is gone, so the controls go too.
        stopSelf();
        super.onTaskRemoved(rootIntent);
    }

    private static String valueOr(String v, String fallback) {
        return v == null || v.isEmpty() ? fallback : v;
    }
}
