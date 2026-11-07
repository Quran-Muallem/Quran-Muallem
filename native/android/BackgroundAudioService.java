package quran.muallem;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/**
 * Media-playback foreground service while a Sheikh recitation plays (see BackgroundAudioPlugin).
 * Holds a partial wake lock while playing so the CPU keeps feeding the WebView's audio with the
 * screen off; the notification offers play / pause and stop.
 */
public class BackgroundAudioService extends Service {
    static volatile BackgroundAudioService instance;

    private static final String CHANNEL_ID = "recitation";
    private static final int NOTIFICATION_ID = 7301;
    private static final String ACTION_TOGGLE = "quran.muallem.audio.TOGGLE";
    private static final String ACTION_STOP = "quran.muallem.audio.STOP";

    private PowerManager.WakeLock wakeLock;
    private String title = "";
    private String artist = "";
    private boolean playing = true;

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
                nm.createNotificationChannel(ch);
            }
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (ACTION_TOGGLE.equals(action)) {
            BackgroundAudioPlugin.emit("toggle");
            return START_NOT_STICKY;
        }
        if (ACTION_STOP.equals(action)) {
            BackgroundAudioPlugin.emit("stop");
            return START_NOT_STICKY;
        }
        if (intent != null) {
            title = valueOr(intent.getStringExtra("title"), title);
            artist = valueOr(intent.getStringExtra("artist"), artist);
            playing = intent.getBooleanExtra("playing", true);
        }
        int type = Build.VERSION.SDK_INT >= 29 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0;
        ServiceCompat.startForeground(this, NOTIFICATION_ID, buildNotification(), type);
        holdWakeLock(playing);
        return START_NOT_STICKY;
    }

    /** New verse / play / pause while the service runs. */
    void update(String newTitle, String newArtist, boolean isPlaying) {
        title = valueOr(newTitle, title);
        artist = valueOr(newArtist, artist);
        playing = isPlaying;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIFICATION_ID, buildNotification());
        holdWakeLock(playing);
    }

    private Notification buildNotification() {
        int immutable = Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0;
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent content = open == null ? null : PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | immutable);
        PendingIntent toggle = PendingIntent.getService(this, 1, new Intent(this, BackgroundAudioService.class).setAction(ACTION_TOGGLE), PendingIntent.FLAG_UPDATE_CURRENT | immutable);
        PendingIntent stop = PendingIntent.getService(this, 2, new Intent(this, BackgroundAudioService.class).setAction(ACTION_STOP), PendingIntent.FLAG_UPDATE_CURRENT | immutable);
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(playing ? android.R.drawable.ic_media_play : android.R.drawable.ic_media_pause)
                .setContentTitle(title)
                .setContentText(artist)
                .setOnlyAlertOnce(true)
                .setShowWhen(false)
                .setOngoing(playing)
                .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .addAction(playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play, playing ? "⏸" : "▶", toggle)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "✕", stop);
        if (content != null) b.setContentIntent(content);
        return b.build();
    }

    private void holdWakeLock(boolean on) {
        if (on) {
            if (wakeLock == null) {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                if (pm == null) return;
                wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "QuranMuallem:recitation");
                wakeLock.setReferenceCounted(false);
            }
            // Renewed with every verse; the timeout only guards against a forgotten lock.
            wakeLock.acquire(15 * 60 * 1000L);
        } else if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
    }

    @Override
    public void onDestroy() {
        holdWakeLock(false);
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        instance = null;
        super.onDestroy();
    }

    private static String valueOr(String v, String fallback) {
        return v == null || v.isEmpty() ? fallback : v;
    }
}
