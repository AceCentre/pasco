(function() {

	var dfs = {"am_pm":["AM","PM"],"day_name":["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],"day_short":["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],"era":["BC","AD"],"era_name":["Before Christ","Anno Domini"],"month_name":["January","February","March","April","May","June","July","August","September","October","November","December"],"month_short":["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],"order_full":"DMY","order_long":"DMY","order_medium":"DMY","order_short":"DMY"};
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
	icu.getLanguage = function() { return "cr" };
	icu.getLanguageName = function() { return "Croatia" };
	icu.getLocale = function() { return "cr" };
	icu.getLocaleName = function() { return "Croatia" };

  icu.rtl = false;
  icu.dictionary = {
    "help_title": "help_title",
    "Toggle navigation": "Uključi navigaciju",
    "Start": "Početak",
    "CONTRIBUTORS": "SURADNICIMA",
    "COPYRIGHT": "AUTORSKA PRAVA",
    "Copyright info": "Podaci o autorskim pravima",
    "Techs": "tehničari",
    "Web Responsive Voice": "Web odgovor na glas",
    "Configure": "Konfigurirati",
    "Help": "Pomozite",
    "Edit Mode": "Način uređivanja",
    "Save": "Uštedjeti",
    "Cancel": "Otkazati",
    "Clear Storage": "Čisto skladištenje",
    "Setting": "postavljanje",
    "Record Audio": "Snimite zvuk",
    "record_btn_desc": "record_btn_desc",
    "For": "Za",
    "Both": "Oba",
    "Main": "Glavni",
    "Cue": "tak",
    "Record": "Snimiti",
    "Audio List": "Popis zvukova",
    "Close": "Zatvoriti",
    "config_title": "config_title",
    "Configuration": "Konfiguracija",
    "Settings": "postavke",
    "On-Screen Navigation": "Navigacija na ekranu",
    "Auto": "Auto",
    "Enable": "Omogućiti",
    "Disable": "Onemogući",
    "Switch Access": "Prebaci pristup",
    "Automatic-Scanning": "Automatsko skeniranje",
    "Manual": "Priručnik",
    "Loops": "petlje",
    "Delay at first item (ms)": "Kašnjenje na prvom stavku (ms)",
    "Auto-scanning delay (ms)": "Kašnjenje automatskog skeniranja (ms)",
    "Switch Key to move forward": "Prebacite tipku za pomicanje prema naprijed",
    "First Time Run (Cue Voice)": "Prvo vođenje (glas Cue)",
    "Voice": "Glas",
    "Volume": "Volumen",
    "Pitch": "Nagib",
    "Using a keyboard: Hitting 1 will go to previous and 2 to next. Also keys W/S, Up/Down arrow will work to navigate the tree": "Upotreba tipkovnice: Ako pritisnete tipku 1, prijeći će na prethodnu, a na sljedeću 2. Također će se kretati drvećem tipke W / S, strelica gore / dolje",
    "Switch key to move forward": "Prebacite tipku za pomicanje prema naprijed",
    "Ignore second hits(ms)": "Zanemari druge pogotke (ms)",
    "Ignore key presses under n ms": "Zanemari pritiske tipki ispod n ms",
    "Speech": "Govor",
    "Cue Voice": "Cue Voice",
    "Main Voice": "Glavni glas",
    "Appearance": "Izgled",
    "Font Size (%)": "Veličina fonta (%)",
    "Theme": "Tema",
    "Default": "Zadano",
    "Light": "Svjetlo",
    "Dark": "mrak",
    "Locale": "scena",
    "Save Config": "Spremi Config",
    "Tree": "drvo",
    "Choose an example tree": "Odaberite primjerno stablo",
    "Pragmatic Phrases": "Pragmatične fraze",
    "Spell by blocks": "Pravopis po blokovima",
    "Spell by blocks in Frequency": "Pravopis po blokovima u frekvenciji",
    "Load Selected": "Učitaj odabrano",
    "Revert": "Vrati",
    "Save Tree": "Spremi stablo",
    "Back option for all branches": "Natrag opcija za sve grane",
    "Switch key to select items": "Prebacite tipku za odabir stavki",
    "Move with the other switch (Step scanning)": "Pomicanje s drugim prekidačem (Korak skeniranja)",
    "Export": "Izvoz",
    "Import": "Uvoz",
    "New": "Novi",
    "Delete": "Izbrisati",
    "Helpers": "pomagači",
    "English (UK)": "Engleski (UK)",
    "German": "njemački",
    "Arabic": "arapski",
    "Spanish": "španjolski",
    "Gujarati": "gujarati",
    "Grey-Red": "Sivo-crvena",
    "Yellow-Black": "Žuto-crna",
    "Black-Yellow": "Crno-žuta",
    "Mint": "menta",
    "Active Tree": "Aktivno drvo",
    "French": "francuski",
    "Jokes": "vicevi",
    "Adult Starter": "Starter početnik",
    "Simple Adult Starter": "Jednostavan početnik za odrasle",
    "Simple Adult Starter - Chinese Main": "Jednostavan za odrasle - kineski glavni",
    "Welsh": "velški",
    "Light-Bold": "Svjetlosna Bold",
    "Spell by Word/Letter Prediction": "Pravopis putem riječi / slova",
    "Access": "Pristup",
    "Vocabulary": "rječnik",
    "Tools": "alat",
    "Edit tree": "Uređivanje stabla",
    "At beginning": "Na početku",
    "At end": "Na kraju",
    "None": "nijedan",
    "Minimum Cue Time(ms)": "Minimalno vrijeme trajanja (ms)",
    "Scrollwheel": "kotačić za pomicanje",
    "1 switch - Auto-Scan": "1 preklopnik - Automatsko skeniranje",
    "2+ Switches": "2+ prekidači",
    "Only for auto-scan access mode": "Samo za način automatskog skeniranja pristupa",
    "On": "Na",
    "Select Item": "Odaberite stavku",
    "Go Back": "Vrati se",
    "Move to Next": "Pomaknite se na Dalje",
    "Move to Previous": "Prelazak na prethodni"
};

})();
