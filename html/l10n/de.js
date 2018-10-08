(function() {

	var dfs = {"am_pm":["AM","PM"],"day_name":["Sonntag, Montag, Dienstag, Mittwoch, Donnerstag, Freitag, Samstag"],"day_short":["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],"era":["BC","AD"],"era_name":["Before Christ","Anno Domini"],"month_name":["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],"month_short":["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],"order_full":"DMY","order_long":"DMY","order_medium":"DMY","order_short":"DMY"};
	var nfs = {"decimal_separator":".","grouping_separator":",","minus":"-"};
	var df = {SHORT_PADDED_CENTURY:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1)+'/'+d.getFullYear());}},SHORT:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1)+'/'+(d.getFullYear()+'').substring(2));}},SHORT_NOYEAR:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1));}},SHORT_NODAY:function(d){if(d){return(((d.getMonth()+101)+'').substring(1)+'/'+(d.getFullYear()+'').substring(2));}},MEDIUM:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'-'+dfs.month_short[d.getMonth()]+'-'+d.getFullYear());}},MEDIUM_NOYEAR:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'-'+dfs.month_short[d.getMonth()]);}},MEDIUM_WEEKDAY_NOYEAR:function(d){if(d){return(dfs.day_short[d.getDay()]+' '+((d.getDate()+101)+'').substring(1)+'-'+dfs.month_short[d.getMonth()]);}},LONG_NODAY:function(d){if(d){return(dfs.month_name[d.getMonth()]+' '+d.getFullYear());}},LONG:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+' '+dfs.month_name[d.getMonth()]+' '+d.getFullYear());}},FULL:function(d){if(d){return(dfs.day_name[d.getDay()]+','+' '+d.getDate()+' '+dfs.month_name[d.getMonth()]+' '+d.getFullYear());}}};
	
	window.icu = window.icu || new Object();
	var icu = window.icu;	
		
	icu.getCountry = function() { return "DE" };
	icu.getCountryName = function() { return "Deutschland" };
	icu.getDateFormat = function(formatCode) { var retVal = {}; retVal.format = df[formatCode]; return retVal; };
	icu.getDateFormats = function() { return df; };
	icu.getDateFormatSymbols = function() { return dfs; };
	icu.getDecimalFormat = function(places) { var retVal = {}; retVal.format = function(n) { var ns = n < 0 ? Math.abs(n).toFixed(places) : n.toFixed(places); var ns2 = ns.split('.'); s = ns2[0]; var d = ns2[1]; var rgx = /(\d+)(\d{3})/;while(rgx.test(s)){s = s.replace(rgx, '$1' + nfs["grouping_separator"] + '$2');} return (n < 0 ? nfs["minus"] : "") + s + nfs["decimal_separator"] + d;}; return retVal; };
	icu.getDecimalFormatSymbols = function() { return nfs; };
	icu.getIntegerFormat = function() { var retVal = {}; retVal.format = function(i) { var s = i < 0 ? Math.abs(i).toString() : i.toString(); var rgx = /(\d+)(\d{3})/;while(rgx.test(s)){s = s.replace(rgx, '$1' + nfs["grouping_separator"] + '$2');} return i < 0 ? nfs["minus"] + s : s;}; return retVal; };
	icu.getLanguage = function() { return "de" };
	icu.getLanguageName = function() { return "Deutsch" };
	icu.getLocale = function() { return "de" };
	icu.getLocaleName = function() { return "German" };

  icu.rtl = false;
  icu.dictionary = {
    "help_title": "PASCO - Hilfe",
    "Toggle navigation": "Navigation umschalten",
    "Start": "Anfang",
    "CONTRIBUTORS": "Mitwirkende",
    "COPYRIGHT": "Urheberrechte ©",
    "Copyright info": "Urheberrechtsinformation",
    "Techs": "Techniker",
    "Web Responsive Voice": "Web-Responsive-Stimme",
    "Configure": "Konfigurieren",
    "Help": "Hilfe",
    "Edit Mode": "Bearbeitungsmodus",
    "Save": "sparen",
    "Cancel": "Stornieren",
    "Clear Storage": "Lager räumen",
    "Setting": "Rahmen",
    "Record Audio": "Ton aufnehmen",
    "record_btn_desc": "Wählen Sie das Ziel für die Aufnahme aus und halten Sie die Aufnahmetaste gedrückt. Durch die Freigabe wird der Datensatz hinzugefügt",
    "For": "Zum",
    "Both": "Beide",
    "Main": "Hauptstimme",
    "Cue": "Stichwort",
    "Record": "Aufzeichnung",
    "Audio List": "Audioliste",
    "Close": "Schließen",
    "config_title": "Pasco - Konfig",
    "Configuration": "Aufbau",
    "Settings": "die Einstellungen",
    "On-Screen Navigation": "Bildschirmnavigation",
    "Auto": "Auto",
    "Enable": "Aktivieren",
    "Disable": "Deaktivieren",
    "Switch Access": "Zugriff umschalten",
    "Automatic-Scanning": "Automatisches Scannen",
    "Manual": "Handbuch",
    "Loops": "Schleifen",
    "Delay at first item (ms)": "Verzögerung beim ersten Gegenstand (ms)",
    "Auto-scanning delay (ms)": "Auto-Scan-Verzögerung (ms)",
    "Switch Key to move forward": "Wechseln Sie die Taste, um vorwärts zu gehen",
    "First Time Run (Cue Voice)": "Erster Lauf (Cue Voice)",
    "Voice": "Stimme",
    "Volume": "Volumen",
    "Pitch": "Tonhöhe",
    "Using a keyboard: Hitting 1 will go to previous and 2 to next. Also keys W/S, Up/Down arrow will work to navigate the tree": "Verwenden einer Tastatur: 1 wird zum vorherigen und 2 zum nächsten gehen. Auch die Tasten W / S und der Pfeil nach oben / unten können den Baum navigieren",
    "Switch key to move forward": "Wechseln Sie die Taste, um vorwärts zu gehen",
    "Ignore second hits(ms)": "Zweite Treffer ignorieren (ms)",
    "Ignore key presses under n ms": "Ignorieren Sie die Taste unter n ms",
    "Speech": "Rede",
    "Cue Voice": "Stimmstimme",
    "Main Voice": "Hauptstimme",
    "Appearance": "Aussehen",
    "Font Size (%)": "Schriftgröße (%)",
    "Theme": "Thema",
    "Default": "Standard",
    "Light": "Licht",
    "Dark": "Dunkel",
    "Locale": "Gebietsschema",
    "Save Config": "Konfiguration speichern",
    "Tree": "Baum",
    "Choose a default tree": "Wählen Sie einen Standardbaum",
    "Pragmatic Phrases": "Pragmatische Phrasen",
    "Spell by blocks": "Buchstabiere nach Blöcken",
    "Spell by blocks in Frequency": "Buchstabiere nach Blöcken in Häufigkeit",
    "Load Selected": "Ausgewählte laden",
    "Revert": "Zurückkehren",
    "Save Tree": "Baum speichern",
    "Back option for all branches": "Zurück Option für alle Zweige",
    "Switch key to select items": "Wechseln Sie mit der Taste, um Elemente auszuwählen",
    "Move with the other switch (Step scanning)": "Bewegen Sie mit dem anderen Schalter (Schritt scannen)",
    "Export": "Export",
    "Import": "Einführen",
    "New": "Neu",
    "Delete": "Löschen",
    "Helpers": "Helfer",
    "English (UK)": "Englisch (UK)",
    "German": "Deutsche",
    "Arabic": "Arabisch",
    "Spanish": "Spanisch",
    "Gujarati": "Gujarati",
    "Grey-Red": "Grau-Rot",
    "Yellow-Black": "Gelb Schwarz",
    "Black-Yellow": "Schwarz Gelb",
    "Mint": "Minze",
    "Active Tree": "Aktiver Baum",
    "French":"Französisch"
  };

})();
