package it.omniaadriatic.segnalazioni;

import android.content.Context;
import android.content.RestrictionsManager;
import android.os.Bundle;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Legge chi siamo, se qualcuno ce l'ha detto.
 *
 * Su un dispositivo di postazione l'app kiosk e' amministratore, e Android le
 * permette di consegnare dei valori alle app che gestisce - si chiamano
 * "configurazioni gestite". Il kiosk ci consegna due cose: quale identita'
 * usare e quale postazione siamo.
 *
 * Serve a togliere di mezzo due difetti.
 *
 * Il numero di postazione oggi si scrive **due volte**, una nella pagina del
 * kiosk e una nella dashboard delle segnalazioni. Due volte a mano vuol dire
 * che prima o poi uno dei due sara' diverso, e un tablet che si crede la
 * postazione 12 mentre il kiosk lo crede la 21 e' un errore che si scopre in
 * agosto, con qualcuno in acqua.
 *
 * E l'identita' di questo dispositivo oggi nasce a caso a ogni installazione:
 * ogni ripristino del telefono lascia dietro una registrazione morta, con lo
 * stesso numero di postazione di quella viva. Ancorandola a quella del kiosk -
 * che vive nel dispositivo amministrato e non nella memoria del browser -
 * l'app si puo' reinstallare quante volte si vuole e resta la stessa riga.
 *
 * **Su un dispositivo senza kiosk non trova niente e non cambia nulla.** Un
 * tablet normale, il telefono di un coordinatore, un browser: si comportano
 * esattamente come prima.
 */
@CapacitorPlugin(name = "Gestito")
public class GestitoPlugin extends Plugin {

    @PluginMethod
    public void leggi(PluginCall call) {
        JSObject risposta = new JSObject();
        risposta.put("deviceId", null);
        risposta.put("postazione", null);

        try {
            RestrictionsManager gestore =
                (RestrictionsManager) getContext().getSystemService(Context.RESTRICTIONS_SERVICE);
            if (gestore != null) {
                Bundle valori = gestore.getApplicationRestrictions();
                if (valori != null) {
                    risposta.put("deviceId", valori.getString("deviceId"));
                    risposta.put("postazione", valori.getString("postazione"));
                }
            }
        } catch (Exception e) {
            // Nessun amministratore, o una versione di Android che non
            // risponde: non e' un errore, e' il caso normale fuori dalle
            // postazioni. Si risponde con due valori vuoti.
        }

        call.resolve(risposta);
    }
}
