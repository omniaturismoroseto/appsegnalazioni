package it.omniaadriatic.segnalazioni;

import android.app.KeyguardManager;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

// Activity a schermo intero mostrata sopra la lockscreen quando arriva
// un'emergenza da una postazione (vedi AlarmService, che la lancia tramite
// una notifica a "full screen intent"). Gli attributi showWhenLocked/
// turnScreenOn nel manifest coprono Android 8.1+ (API 27+); i flag qui sotto
// sono il fallback per le versioni precedenti (minSdk 24).
public class AlarmActivity extends AppCompatActivity {

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

        setContentView(R.layout.activity_alarm);

        String station = getIntent() != null ? getIntent().getStringExtra("station") : "";
        TextView subtitle = findViewById(R.id.alarmSubtitle);
        if (subtitle != null && station != null && !station.isEmpty()) {
            subtitle.setText("Allarme immediato dalla postazione P." + station);
        }

        Button btnOpen = findViewById(R.id.btnOpenApp);
        Button btnStop = findViewById(R.id.btnStop);

        btnOpen.setOnClickListener(v -> {
            AlarmService.requestStop(this);
            Intent i = new Intent(this, MainActivity.class);
            i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(i);
            finish();
        });

        btnStop.setOnClickListener(v -> {
            AlarmService.requestStop(this);
            finish();
        });
    }

    // Se arriva un'altra emergenza mentre questa schermata e' gia' aperta
    // (launchMode singleTask), aggiorna solo il testo invece di impilare activity.
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String station = intent != null ? intent.getStringExtra("station") : "";
        TextView subtitle = findViewById(R.id.alarmSubtitle);
        if (subtitle != null && station != null && !station.isEmpty()) {
            subtitle.setText("Allarme immediato dalla postazione P." + station);
        }
    }
}
