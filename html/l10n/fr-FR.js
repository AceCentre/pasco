(function() {

	var dfs = {"am_pm":["am","pm"],"day_name":["Dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi et samedi"],"day_short":["Dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi et samedi"],"era":["avant JC","UN D"],"era_name":["BC", "AD"],"month_name":["Enero"," febrero"," marzo"," abril"," mayo"," junio"," julio"," agosto"," septiembre"," octubre"," noviembre"," diciembre"],"month_short":["Enero"," febrero"," marzo"," abril"," mayo"," junio"," julio"," agosto"," septiembre"," octubre"," noviembre"," diciembre"],"order_full":"DMY","order_long":"DMY","order_medium":"DMY","order_short":"DMY"};
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
	icu.getLanguage = function() { return "fr-FR" };
	icu.getLanguageName = function() { return "Français" };
	icu.getLocale = function() { return "fr-FR" };
	icu.getLocaleName = function() { return "Français" };

  icu.rtl = false;
  icu.dictionary = {
    "help_title": "PASCO - Aide",
    "Toggle navigation": "Basculer la navigation",
    "Start": "Début",
    "CONTRIBUTORS": "Contributeurs",
    "COPYRIGHT": "droits d'auteur",
    "Copyright info": "Informations sur le droit d'auteur",
    "Techs": "Techs",
    "Web Responsive Voice": "Web responsive Voice",
    "Configure": "Configurer",
    "Help": "Aidez-moi",
    "Edit Mode": "Mode édition",
    "Save": "sauvegarder",
    "Cancel": "Annuler",
    "Clear Storage": "Effacer le stockage",
    "Setting": "Réglage",
    "Record Audio": "Enregistrement audio",
    "record_btn_desc": "Sélectionnez la cible pour l'enregistrement et en maintenant enfoncé le bouton d'enregistrement, l'enregistrement commence. En le libérant, l'enregistrement sera ajouté",
    "For": "Pour",
    "Both": "Tous les deux",
    "Main": "Voix principale",
    "Cue": "Signal",
    "Record": "Record",
    "Audio List": "Liste Audio",
    "Close": "Fermer",
    "config_title": "pasco - Config",
    "Configuration": "Configuration",
    "Settings": "Paramètres",
    "On-Screen Navigation": "Navigation à l'écran",
    "Auto": "Auto",
    "Enable": "Activer",
    "Disable": "Désactiver",
    "Switch Access": "Changer d'accès",
    "Automatic-Scanning": "Balayage automatique",
    "Manual": "Manuel",
    "Loops": "Boucles",
    "Delay at first item (ms)": "Délai au premier élément (ms)",
    "Auto-scanning delay (ms)": "Délai de numérisation automatique (ms)",
    "Switch Key to move forward": "Interrupteur pour avancer",
    "First Time Run (Cue Voice)": "First Time Run (Cue Voice)",
    "Voice": "Voix",
    "Volume": "Le volume",
    "Pitch": "Pas",
    "Using a keyboard: Hitting 1 will go to previous and 2 to next. Also keys W/S, Up/Down arrow will work to navigate the tree": "Utiliser un clavier: Frapper 1 ira au précédent et 2 au suivant. Les touches W / S et les flèches haut / bas permettent également de naviguer dans l’arbre.",
    "Switch key to move forward": "Interrupteur pour avancer",
    "Ignore second hits(ms)": "Ignorer les seconds hits (ms)",
    "Ignore key presses under n ms": "Ignorer les touches enfoncées sous n ms",
    "Speech": "Discours",
    "Cue Voice": "Cue Voice",
    "Main Voice": "Voix principale",
    "Appearance": "Apparence",
    "Font Size (%)": "Taille de police (%)",
    "Theme": "Thème",
    "Default": "Défaut",
    "Light": "Lumière",
    "Dark": "Foncé",
    "Locale": "Lieu",
    "Save Config": "Enregistrer la configuration",
    "Tree": "Arbre",
    "Choose a default tree": "Choisissez une arborescence par défaut",
    "Pragmatic Phrases": "Phrases pragmatiques",
    "Spell by blocks": "Épeler par blocs",
    "Spell by blocks in Frequency": "Épeler par blocs dans la fréquence",
    "Load Selected": "Charger la sélection",
    "Revert": "Revenir",
    "Save Tree": "Enregistrer l'arbre",
    "Back option for all branches": "Option de retour pour toutes les branches",
    "Switch key to select items": "Interrupteur pour sélectionner des éléments",
    "Move with the other switch (Step scanning)": "Déplacer avec l'autre commutateur (balayage pas à pas)",
    "Export": "Exportation",
    "Import": "Importer",
    "New": "Nouveau",
    "Delete": "Effacer",
    "Helpers": "Aides",
    "English (UK)": "Anglais (Royaume-Uni)",
    "German": "allemand",
    "Arabic": "arabe",
    "Spanish": "Espanol",
    "Gujarati": "Gujarati",
    "Grey-Red": "Gris-rouge",
    "Yellow-Black": "Jaune-noir",
    "Black-Yellow": "Noir jaune",
    "Mint": "menthe",
    "Active Tree": "Arbre actif",
    "French":"Français"
  };

})();
