package it.omniaadriatic.segnalazioni;

import android.content.Intent;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

// Sostituisce (vedi AndroidManifest.xml, tools:node="remove" sul servizio di
// default) il MessagingService di @capacitor/push-notifications: richiama la
// stessa identica logica per il bridge JS (funziona quindi come prima per le
// segnalazioni normali), e in piu' fa scattare l'allarme a schermo intero per
// le emergenze di postazione. E' l'unico modo per reagire sempre, anche con
// l'app in background o completamente chiusa - per questo la Cloud Function
// (functions/index.js) manda i push station_emergency come "solo dati", mai
// come "notification": un payload con "notification" mentre l'app non e' in
// primo piano lo gestisce direttamente il sistema, senza mai passare da qui.
public class OmniaMessagingService extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        String type = data.get("type");
        if ("station_emergency".equals(type)) {
            String station = data.get("station");
            Intent i = new Intent(this, AlarmService.class);
            i.putExtra("station", station != null ? station : "");
            ContextCompat.startForegroundService(this, i);
        } else if ("chat_audio".equals(type)) {
            // Walkie-talkie: riproduce subito il messaggio vocale da solo,
            // a volume forte (vedi ChatAudioService) - stesso schema del
            // ramo sopra, l'audio vero e proprio non entra nel push (troppo
            // grande) e arriva in streaming da getChatAudio.
            Intent i = new Intent(this, ChatAudioService.class);
            i.putExtra("authorLabel", data.get("authorLabel"));
            i.putExtra("audioUrl", data.get("audioUrl"));
            ContextCompat.startForegroundService(this, i);
        }

        // Comportamento preesistente: inoltra sempre il messaggio al bridge
        // Capacitor/JS (usato quando l'app e' in primo piano).
        PushNotificationsPlugin.sendRemoteMessage(remoteMessage);
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        PushNotificationsPlugin.onNewToken(token);
    }
}
