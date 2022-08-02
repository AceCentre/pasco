(function() {

	var dfs = {"am_pm":["am","pm"],"day_name":["Domingo", "lunes", "martes", "miércoles", "jueves", "viernes y sábados"],"day_short":["Domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],"era":["ق.م","م"],"era_name":["BC", "AD"],"month_name":["Enero"," febrero"," marzo"," abril"," mayo"," junio"," julio"," agosto"," septiembre"," octubre"," noviembre"," diciembre"],"month_short":["Enero"," febrero"," marzo"," abril"," mayo"," junio"," julio"," agosto"," septiembre"," octubre"," noviembre"," diciembre"],"order_full":"DMY","order_long":"DMY","order_medium":"DMY","order_short":"DMY"};
	var nfs = {"decimal_separator":"٫","grouping_separator":"٬","minus":"-"};
	var df = {SHORT_PADDED_CENTURY:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1)+'/'+d.getFullYear());}},SHORT:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1)+'/'+(d.getFullYear()+'').substring(2));}},SHORT_NOYEAR:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1));}},SHORT_NODAY:function(d){if(d){return(((d.getMonth()+101)+'').substring(1)+'/'+(d.getFullYear()+'').substring(2));}},MEDIUM:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1)+'/'+d.getFullYear());}},MEDIUM_NOYEAR:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1));}},MEDIUM_WEEKDAY_NOYEAR:function(d){if(d){return(dfs.day_short[d.getDay()]+' '+((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1));}},LONG_NODAY:function(d){if(d){return(dfs.month_name[d.getMonth()]+','+' '+d.getFullYear());}},LONG:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+' '+dfs.month_name[d.getMonth()]+','+' '+d.getFullYear());}},FULL:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+' '+dfs.month_name[d.getMonth()]+','+' '+d.getFullYear());}}};
	
	window.icu = window.icu || new Object();
	var icu = window.icu;	
		
	icu.getCountry = function() { return "" };
	icu.getCountryName = function() { return "" };
	icu.getDateFormat = function(formatCode) { var retVal = {}; retVal.format = df[formatCode]; return retVal; };
	icu.getDateFormats = function() { return df; };
	icu.getDateFormatSymbols = function() { return dfs; };
	icu.getDecimalFormat = function(places) { var retVal = {}; retVal.format = function(n) { var ns = n < 0 ? Math.abs(n).toFixed(places) : n.toFixed(places); var ns2 = ns.split('.'); s = ns2[0]; var d = ns2[1]; var rgx = /(\d+)(\d{3})/;while(rgx.test(s)){s = s.replace(rgx, '$1' + nfs["grouping_separator"] + '$2');} return (n < 0 ? nfs["minus"] : "") + s + nfs["decimal_separator"] + d;}; return retVal; };
	icu.getDecimalFormatSymbols = function() { return nfs; };
	icu.getIntegerFormat = function() { var retVal = {}; retVal.format = function(i) { var s = i < 0 ? Math.abs(i).toString() : i.toString(); var rgx = /(\d+)(\d{3})/;while(rgx.test(s)){s = s.replace(rgx, '$1' + nfs["grouping_separator"] + '$2');} return i < 0 ? nfs["minus"] + s : s;}; return retVal; };
	icu.getLanguage = function() { return "ro" };
	icu.getLanguageName = function() { return "limba română" };
	icu.getLocale = function() { return "ro" };
	icu.getLocaleName = function() { return "limba română" };

  icu.rtl = false;
  icu.dictionary = {
    "help_title": "help_title",
    "Toggle navigation": "Comutare navigare",
    "Start": "start",
    "CONTRIBUTORS": "COLABORATORI",
    "COPYRIGHT": "DREPTURI DE AUTOR",
    "Copyright info": "Informații privind drepturile de autor",
    "Techs": "Techs",
    "Web Responsive Voice": "Voce web responsabilă",
    "Configure": "Configurarea",
    "Help": "Ajutor",
    "Edit Mode": "Mod de editare",
    "Save": "Salvați",
    "Cancel": "Anulare",
    "Clear Storage": "Spațiu de depozitare liber",
    "Setting": "reglaj",
    "Record Audio": "Înregistrează audio",
    "record_btn_desc": "record_btn_desc",
    "For": "Pentru",
    "Both": "Ambii",
    "Main": "Principal",
    "Cue": "Tac",
    "Record": "Record",
    "Audio List": "Lista audio",
    "Close": "Închide",
    "config_title": "config_title",
    "Configuration": "configurație",
    "Settings": "Setări",
    "On-Screen Navigation": "Navigare pe ecran",
    "Auto": "Auto",
    "Enable": "Permite",
    "Disable": "Dezactivați",
    "Switch Access": "Acces la comutator",
    "Automatic-Scanning": "Automat de scanare",
    "Manual": "Manual",
    "Loops": "buclele",
    "Delay at first item (ms)": "Întârziere la primul articol (ms)",
    "Auto-scanning delay (ms)": "Întârziere de scanare automată (ms)",
    "Switch Key to move forward": "Comutarea tastei pentru a merge mai departe",
    "First Time Run (Cue Voice)": "First Time Run (Cue Voice)",
    "Voice": "Voce",
    "Volume": "Volum",
    "Pitch": "Pas",
    "Using a keyboard: Hitting 1 will go to previous and 2 to next. Also keys W/S, Up/Down arrow will work to navigate the tree": "Folosind o tastatură: Apăsarea 1 va trece la precedent și 2 la următorul. De asemenea, tastele W / S, săgeata sus / jos vor funcționa pentru a naviga în copac",
    "Switch key to move forward": "Comutați tasta pentru a merge mai departe",
    "Ignore second hits(ms)": "Ignoră secundele accesări (ms)",
    "Ignore key presses under n ms": "Ignorați apăsările tastei sub n ms",
    "Speech": "Vorbire",
    "Cue Voice": "Vocea Cue",
    "Main Voice": "Vocea principală",
    "Appearance": "Aspect",
    "Font Size (%)": "Marimea fontului (%)",
    "Theme": "Temă",
    "Default": "Mod implicit",
    "Light": "Ușoară",
    "Dark": "Întuneric",
    "Locale": "locale",
    "Save Config": "Salvați Config",
    "Tree": "Copac",
    "Choose an example tree": "Alegeți un arbore de exemplu",
    "Pragmatic Phrases": "Fraze pragmatice",
    "Spell by blocks": "Vraja pe blocuri",
    "Spell by blocks in Frequency": "Vraja prin blocuri în Frecvență",
    "Load Selected": "Sarcina selectată",
    "Revert": "Reveni",
    "Save Tree": "Salvați Arborele",
    "Back option for all branches": "Opțiune înapoi pentru toate ramurile",
    "Switch key to select items": "Comutați tasta pentru a selecta elemente",
    "Move with the other switch (Step scanning)": "Deplasați-vă cu celălalt comutator (scanare pas)",
    "Export": "Export",
    "Import": "Import",
    "New": "Nou",
    "Delete": "Șterge",
    "Helpers": "Helpers",
    "English (UK)": "Engleză (Marea Britanie)",
    "German": "limba germana",
    "Arabic": "arabic",
    "Spanish": "Spaniolă",
    "Gujarati": "Gujarati",
    "Grey-Red": "Gri-Rosu",
    "Yellow-Black": "Galben-negru",
    "Black-Yellow": "Galben închis",
    "Mint": "Mentă",
    "Active Tree": "Arbore activ",
    "French": "limba franceza",
    "Jokes": "Glume",
    "Adult Starter": "Starter pentru adulți",
    "Simple Adult Starter": "Starter simplu pentru adulți",
    "Simple Adult Starter - Chinese Main": "Starter simplu pentru adulți - principal chinezesc",
    "Welsh": "velșă",
    "Light-Bold": "Light-Bold",
    "Spell by Word/Letter Prediction": "Vraja după cuvânt / predicție scrisoare",
    "Access": "Acces",
    "Vocabulary": "Vocabular",
    "Tools": "Unelte",
    "Edit tree": "Modificați arborele",
    "At beginning": "La început",
    "At end": "La sfârșit",
    "None": "Nici unul",
    "Minimum Cue Time(ms)": "Timpul minim de cue (ms)",
    "Scrollwheel": "rotița de derulare",
    "1 switch - Auto-Scan": "1 comutator - Scanare automată",
    "2+ Switches": "2+ comutatoare",
    "Only for auto-scan access mode": "Numai pentru modul de acces la scanare automată",
    "On": "Pe",
    "Select Item": "Selectați elementul",
    "Go Back": "Întoarce-te",
    "Move to Next": "Treceți la Următorul",
    "Move to Previous": "Treceți la Previous"
};

  document.dispatchEvent(new CustomEvent('x-icu-changed', { detail: icu }))
})();
