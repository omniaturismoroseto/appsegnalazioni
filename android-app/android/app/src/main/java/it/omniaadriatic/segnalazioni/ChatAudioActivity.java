package it.omniaadriatic.segnalazioni;

import android.app.KeyguardManager;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

// Popup a schermo intero mostrato quando arriva un messaggio vocale nella
// chat interna (vedi ChatAudioService, che la lancia tramite una notifica a
// "full screen intent" mentre l'audio e' gia' in riproduzione da solo).
// Pulsanti riascolta/rispondi/chiudi come da richiesta.
public class ChatAudioActivity extends AppCompatActivity {

    private MediaPlayer replayPlayer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
            if (km != null) km.requestDismissKeyguard(this, null);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                    | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            );
        }

        setContentView(R.layout.activity_chat_audio);

        String author = getIntent() != null ? getIntent().getStringExtra("authorLabel") : "";
        TextView authorView = findViewById(R.id.chatAudioAuthor);
        if (authorView != null) authorView.setText(author == null ? "" : "da " + author);

        Button btnReplay = findViewById(R.id.btnReplay);
        Button btnReply = findViewById(R.id.btnReply);
        Button btnClose = findViewById(R.id.btnClose);

        btnReplay.setOnClickListener(v -> replay());

        btnReply.setOnClickListener(v -> {
            stopReplay();
            Intent i = new Intent(this, MainActivity.class);
            i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(i);
            finish();
        });

        btnClose.setOnClickListener(v -> finish());
    }

    private void replay() {
        String audioUrl = getIntent() != null ? getIntent().getStringExtra("audioUrl") : null;
        if (audioUrl == null) return;
        stopReplay();
        try {
            replayPlayer = new MediaPlayer();
            replayPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            );
            replayPlayer.setDataSource(audioUrl);
            replayPlayer.setOnPreparedListener(MediaPlayer::start);
            replayPlayer.prepareAsync();
        } catch (Exception e) {
            // silenzioso: l'operatore puo' comunque riprovare col pulsante
        }
    }

    private void stopReplay() {
        if (replayPlayer != null) {
            try {
                if (replayPlayer.isPlaying()) replayPlayer.stop();
                replayPlayer.release();
            } catch (Exception e) {
                // ignorato: stiamo comunque per scartare il riferimento
            }
            replayPlayer = null;
        }
    }

    @Override
    protected void onDestroy() {
        stopReplay();
        super.onDestroy();
    }
}
