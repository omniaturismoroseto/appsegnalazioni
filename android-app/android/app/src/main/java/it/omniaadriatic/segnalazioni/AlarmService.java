package it.omniaadriatic.segnalazioni;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

// Servizio in foreground che fa suonare in loop la suoneria di sistema per le
// sveglie/allarmi (canale audio ALARM: piu' probabile che si senta anche a
// volume suonerie basso) e mostra una notifica a schermo intero (vedi
// AlarmActivity) finche' l'operatore non la ferma. Avviato da
// OmniaMessagingService quando arriva un push station_emergency.
public class AlarmService extends Service {

    public static final String CHANNEL_ID = "omnia_emergenze_allarme";
    public static final String ACTION_STOP = "it.omniaadriatic.segnalazioni.STOP_ALARM";
    private static final int NOTIFICATION_ID = 1001;

    private MediaPlayer mediaPlayer;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopAlarm();
            return START_NOT_STICKY;
        }

        String station = intent != null ? intent.getStringExtra("station") : "";
        Notification notification = buildNotification(station);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        playAlarmSound();
        return START_STICKY;
    }

    private void createChannel() {
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Allarmi emergenza postazione",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Allarme a schermo intero quando una postazione lancia un'emergenza");
        // Il suono lo gestisce direttamente il MediaPlayer (per farlo suonare in
        // loop finche' non viene fermato): il canale non deve suonarne un altro sopra.
        channel.setSound(null, null);
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[] { 0, 500, 200, 500, 200, 500 });
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) nm.createNotificationChannel(channel);
    }

    private Notification buildNotification(String station) {
        Intent fullScreenIntent = new Intent(this, AlarmActivity.class);
        fullScreenIntent.putExtra("station", station);
        fullScreenIntent.setFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP
        );
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
            this, 0, fullScreenIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent stopIntent = new Intent(this, AlarmService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getService(
            this, 0, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("🚨 EMERGENZA — P." + station)
            .setContentText("Allarme immediato dalla postazione. Tocca per aprire.")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent)
            .addAction(0, "Ferma allarme", stopPendingIntent)
            .setOngoing(true)
            .setAutoCancel(false)
            .build();
    }

    private void playAlarmSound() {
        stopMediaPlayer();
        try {
            Uri alarmUri = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM);
            if (alarmUri == null) {
                alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            );
            mediaPlayer.setDataSource(this, alarmUri);
            mediaPlayer.setLooping(true);
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (Exception e) {
            // Se il suono fallisce la notifica a schermo intero + vibrazione restano comunque attive.
        }
    }

    private void stopMediaPlayer() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) mediaPlayer.stop();
                mediaPlayer.release();
            } catch (Exception e) {
                // ignorato: stiamo comunque per scartare il riferimento
            }
            mediaPlayer = null;
        }
    }

    private void stopAlarm() {
        stopMediaPlayer();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        stopSelf();
    }

    // Richiamato da AlarmActivity quando l'operatore preme "Ferma allarme".
    public static void requestStop(Context ctx) {
        Intent i = new Intent(ctx, AlarmService.class);
        i.setAction(ACTION_STOP);
        ctx.startService(i);
    }

    @Override
    public void onDestroy() {
        stopMediaPlayer();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
