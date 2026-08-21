package it.omniaadriatic.segnalazioni;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

// Riproduce SUBITO e da solo (nessun tocco necessario) un messaggio vocale
// della chat interna appena arrivato - come una vera radio walkie-talkie:
// canale audio ALARM (si sente anche a volume/suoneria bassi o silenziosi,
// stesso canale usato per l'allarme di emergenza vero e proprio, ma qui la
// riproduzione e' singola, non in loop). Avviato da OmniaMessagingService
// per i push di tipo chat_audio. L'audio non arriva nel push (troppo
// grande, vedi functions/index.js): MediaPlayer lo scarica in streaming
// direttamente dall'URL di getChatAudio.
public class ChatAudioService extends Service {

    public static final String CHANNEL_ID = "omnia_chat_audio";
    private static final int NOTIFICATION_ID = 1002;

    private MediaPlayer mediaPlayer;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String author = intent != null ? intent.getStringExtra("authorLabel") : "";
        String audioUrl = intent != null ? intent.getStringExtra("audioUrl") : null;

        Notification notification = buildNotification(author, intent);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        if (audioUrl != null) playAudio(audioUrl);
        else stopSelf();

        return START_NOT_STICKY;
    }

    private void createChannel() {
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Messaggi vocali (walkie-talkie)",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Riproduzione automatica dei messaggi vocali dalla chat interna");
        channel.setSound(null, null); // il suono e' l'audio stesso, non un suono di notifica
        channel.enableVibration(true);
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) nm.createNotificationChannel(channel);
    }

    private Notification buildNotification(String author, Intent sourceIntent) {
        Intent activityIntent = new Intent(this, ChatAudioActivity.class);
        if (sourceIntent != null) activityIntent.putExtras(sourceIntent);
        activityIntent.setFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP
        );
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, activityIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("🎙️ " + (author == null || author.isEmpty() ? "Chat interna" : author))
            .setContentText("Messaggio vocale in riproduzione...")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setFullScreenIntent(pendingIntent, true)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build();
    }

    private void playAudio(String url) {
        try {
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            );
            mediaPlayer.setDataSource(url);
            mediaPlayer.setOnPreparedListener(MediaPlayer::start);
            mediaPlayer.setOnCompletionListener(mp -> stopSelf());
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                stopSelf();
                return true;
            });
            mediaPlayer.prepareAsync();
        } catch (Exception e) {
            stopSelf();
        }
    }

    @Override
    public void onDestroy() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) mediaPlayer.stop();
                mediaPlayer.release();
            } catch (Exception e) {
                // ignorato: stiamo comunque per scartare il riferimento
            }
            mediaPlayer = null;
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
