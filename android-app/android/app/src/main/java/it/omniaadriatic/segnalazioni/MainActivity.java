package it.omniaadriatic.segnalazioni;

import android.app.NotificationChannel;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createChatChannel();
        createReportChannels();
    }

    // Livello 3 della scala dei suoni: "quando puoi, leggi".
    //
    // I canali di notifica Android vanno creati PRIMA che arrivi la notifica da
    // mostrare. Per i messaggi "solo dati" (station_emergency) il canale lo crea
    // AlarmService quando serve davvero; per la chat - un push normale
    // "notification+data" che il sistema puo' mostrare anche senza mai passare
    // dal nostro codice se l'app e' in background - il canale deve esistere gia'
    // da prima, quindi lo creiamo qui all'avvio.
    //
    // Suono di notifica normale e importanza media: la chat non deve mai
    // sembrare un'emergenza. Resta pero' visibile nella tendina finche' non la
    // si apre, che e' il modo di non far perdere un messaggio senza insistere.
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

    // Livello 2 della scala dei suoni: "guarda lo schermo appena puoi".
    //
    // Il server manda qui le segnalazioni del proprio tratto e le persone
    // smarrite (vedi buildMessage in functions/index.js). Su Android 8 e
    // successivi una notifica che indica un canale inesistente viene scartata
    // **senza errore**: il server direbbe "inviata", il telefono non
    // mostrerebbe niente e non ci sarebbe modo di accorgersene dai log. Per
    // questo il canale va creato all'avvio, come gia' si fa per la chat.
    //
    // Il suono e' la SUONERIA di sistema, non il tono di notifica usato dalla
    // chat: e' cosi' che i due livelli si distinguono a orecchio senza
    // guardare lo schermo, che e' tutto il punto della scala. Nessun file
    // audio dentro l'app - i suoni di sistema non vanno mantenuti e restano
    // coerenti con come e' impostato il telefono.
    //
    // Attenzione se un domani si vuole cambiare questo suono: un canale gia'
    // creato su un telefono non si puo' piu' modificare dall'app. Servirebbe un
    // identificativo nuovo, lasciando il vecchio in mezzo alle impostazioni,
    // oppure disinstallare e reinstallare l'app su ogni apparecchio.
    private void createReportChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;

        NotificationChannel allerta = new NotificationChannel(
            "omnia_allerta",
            "Allerta postazione",
            NotificationManager.IMPORTANCE_HIGH
        );
        allerta.setDescription("Segnalazioni del proprio tratto e persone smarrite");
        allerta.enableVibration(true);
        allerta.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 500});
        allerta.setSound(
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
            new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
        );
        nm.createNotificationChannel(allerta);
    }
}
