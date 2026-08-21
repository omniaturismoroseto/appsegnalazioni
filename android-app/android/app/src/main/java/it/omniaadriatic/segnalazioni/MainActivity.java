package it.omniaadriatic.segnalazioni;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createChatChannel();
    }

    // I canali di notifica Android vanno creati PRIMA che arrivi la
    // notifica da mostrare. Per i messaggi "solo dati" (station_emergency)
    // il canale lo crea AlarmService quando serve davvero; per la chat -
    // un push normale "notification+data" che il sistema puo' mostrare
    // anche senza mai passare dal nostro codice se l'app e' in background -
    // il canale deve esistere gia' da prima, quindi lo creiamo qui all'avvio.
    private void createChatChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            "omnia_chat",
            "Chat interna",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("Nuovi messaggi nella chat interna tra postazioni e operatori");
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) nm.createNotificationChannel(channel);
    }
}
