package quran.muallem;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.view.KeyEvent;

import androidx.core.app.ServiceCompat;

/**
 * v45 «المراجعة الحرة»: microphone foreground service (FOREGROUND_SERVICE_MICROPHONE) while the hands-free
 * Hifdh mode listens, so the WebView's microphone and on-device recognition keep running with the screen
 * off / locked in a pocket. Low-priority, silent notification («المراجعة الحرة نشطة - في انتظار التلاوة»),
 * updated with the current status; a partial wake lock keeps the CPU running. A MediaSession receives the
 * headset / AirPods / car buttons (play-pause → pause or resume listening, next / previous → repeat the last
 * prompt) and hands them to the web layer through BackgroundAudioPlugin ("handsfree" events).
 * Started / stopped by BackgroundAudioPlugin.startHandsFree / stopHandsFree, only while the app is in the
 * foreground (Android 14 rule for microphone services).
 */
public class HandsFreeMicService extends Service {
    static volatile HandsFreeMicService instance;
    private static final String CHANNEL_ID = "handsfree";
    private static final int NOTIFICATION_ID = 7311;
    static final String EXTRA_TITLE = "title";
    static final String EXTRA_TEXT = "text";

    private PowerManager.WakeLock wakeLock;
    private MediaSession session;
    private String title = "Quran Muallem";
    private String text = "المراجعة الحرة نشطة - في انتظار التلاوة";

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm != null && nm.getNotificationChannel(CHANNEL_ID) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "المراجعة الحرة", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Hands-free Hifdh: listening for your recitation");
            ch.setSound(null, null);
            ch.enableVibration(false);
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "QuranMuallem:handsfree");
            wakeLock.setReferenceCounted(false);
        }
        session = new MediaSession(this, "QuranMuallemHandsFree");
        session.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { BackgroundAudioPlugin.emitHandsFree("play"); }
            @Override public void onPause() { BackgroundAudioPlugin.emitHandsFree("pause"); }
            @Override public void onSkipToNext() { BackgroundAudioPlugin.emitHandsFree("repeat"); }
            @Override public void onSkipToPrevious() { BackgroundAudioPlugin.emitHandsFree("repeat"); }
            @Override public boolean onMediaButtonEvent(Intent intent) {
                KeyEvent ev = intent.getParcelableExtra(Intent.EXTRA_KEY_EVENT);
                if (ev != null && ev.getAction() == KeyEvent.ACTION_DOWN && ev.getKeyCode() == KeyEvent.KEYCODE_HEADSETHOOK) {
                    BackgroundAudioPlugin.emitHandsFree("toggle");
                    return true;
                }
                return super.onMediaButtonEvent(intent);
            }
        });
        session.setPlaybackState(new PlaybackState.Builder()
                .setActions(PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_PLAY_PAUSE | PlaybackState.ACTION_SKIP_TO_NEXT | PlaybackState.ACTION_SKIP_TO_PREVIOUS)
                .setState(PlaybackState.STATE_PLAYING, 0, 1f).build());
        session.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String t = intent.getStringExtra(EXTRA_TITLE), x = intent.getStringExtra(EXTRA_TEXT);
            if (t != null) title = t;
            if (x != null) text = x;
        }
        Notification n = build();
        int type = Build.VERSION.SDK_INT >= 30 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE : 0;
        try {
            ServiceCompat.startForeground(this, NOTIFICATION_ID, n, type);
        } catch (Exception e) {
            // e.g. microphone permission missing: run without the service rather than crash.
            stopSelf();
            return START_NOT_STICKY;
        }
        if (wakeLock != null && !wakeLock.isHeld()) wakeLock.acquire(6 * 60 * 60 * 1000L);
        return START_NOT_STICKY;
    }

    /** New status text on the notification / lock screen. */
    void update(String newTitle, String newText) {
        if (newTitle != null) title = newTitle;
        if (newText != null) text = newText;
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIFICATION_ID, build());
    }

    private Notification build() {
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = open == null ? null : PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(this, CHANNEL_ID) : new Notification.Builder(this);
        b.setContentTitle(title).setContentText(text).setOngoing(true).setOnlyAlertOnce(true)
                .setSmallIcon(getApplicationInfo().icon).setCategory(Notification.CATEGORY_SERVICE)
                .setVisibility(Notification.VISIBILITY_PUBLIC);
        if (pi != null) b.setContentIntent(pi);
        if (Build.VERSION.SDK_INT < 26) b.setPriority(Notification.PRIORITY_LOW);
        return b.build();
    }

    @Override
    public void onDestroy() {
        instance = null;
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        if (session != null) { session.setActive(false); session.release(); }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
