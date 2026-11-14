package __APP_ID__;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackgroundAudioPlugin.class);
        super.onCreate(savedInstanceState);
    }

    /**
     * v49: while «المراجعة الحرة» or «رفيق الصلاة» listen (BackgroundAudioPlugin.keepWebViewAlive), the screen may
     * turn off: Android then hides the WebView, which throttles its timers and audio. Tell it again that it is
     * visible and running, so recognition and prompts go on in the pocket. Normal use is unchanged.
     */
    private void keepAlive() {
        if (!BackgroundAudioPlugin.keepWebViewAlive || bridge == null) return;
        final WebView wv = bridge.getWebView();
        if (wv == null) return;
        wv.postDelayed(() -> {
            if (!BackgroundAudioPlugin.keepWebViewAlive) return;
            try { wv.onResume(); wv.resumeTimers(); wv.dispatchWindowVisibilityChanged(View.VISIBLE); } catch (Exception ignored) { }
        }, 250);
    }

    @Override
    public void onPause() {
        super.onPause();
        keepAlive();
    }

    @Override
    public void onStop() {
        super.onStop();
        keepAlive();
    }
}
