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
	icu.getLanguage = function() { return "es-ES" };
	icu.getLanguageName = function() { return "Español" };
	icu.getLocale = function() { return "es-ES" };
	icu.getLocaleName = function() { return "العربية" };

  icu.rtl = false;
  icu.dictionary = {
    "help_title": "PASCO - Ayuda",
    "Toggle navigation": "Navegación de palanca",
    "Start": "Comienzo",
    "CONTRIBUTORS": "COLABORADORES",
    "COPYRIGHT": "DERECHOS DE AUTOR",
    "Copyright info": "Información de copyright",
    "Techs": "Techs",
    "Web Responsive Voice": "Voz sensible a la web",
    "Configure": "Configurar",
    "Help": "Ayuda",
    "Edit Mode": "Modo de edición",
    "Save": "Salvar",
    "Cancel": "Cancelar",
    "Clear Storage": "Almacenaje vacío",
    "Setting": "Ajuste",
    "Record Audio": "Grabar audio",
    "record_btn_desc": "Seleccione el objetivo para la grabación y al mantener presionado el botón de grabación comienza el registro. Al lanzarlo se añadirá el registro.",
    "For": "por",
    "Both": "Ambos",
    "Main": "Principal",
    "Cue": "Señal",
    "Record": "Grabar",
    "Audio List": "Lista de audio",
    "Close": "Cerca",
    "config_title": "Configuración",
    "Configuration": "Configuración",
    "Settings": "Configuración",
    "On-Screen Navigation": "Navegación en pantalla",
    "Auto": "Automático",
    "Enable": "Habilitar",
    "Disable": "Inhabilitar",
    "Switch Access": "Cambiar el acceso",
    "Automatic-Scanning": "Escaneo automático",
    "Manual": "Manual",
    "Loops": "Bucles",
    "Delay at first item (ms)": "Retraso en el primer artículo (ms)",
    "Auto-scanning delay (ms)": "Auto-scanning delay (ms)",
    "Switch Key to move forward": "Cambiar la tecla para avanzar",
    "First Time Run (Cue Voice)": "First Time Run (voz de cue)",
    "Voice": "Voz",
    "Volume": "Volumen",
    "Pitch": "Tono",
    "Using a keyboard: Hitting 1 will go to previous and 2 to next. Also keys W/S, Up/Down arrow will work to navigate the tree": "Golpear 1 irá al anterior y 2 al próximo. También W / S, flecha arriba / abajo funcionará.",
    "Switch key to move forward": "Cambiar la tecla para avanzar",
    "Ignore second hits(ms)": "Ignorar segundos aciertos (ms)",
    "Ignore key presses under n ms": "Ignore las pulsaciones de tecla en n ms",
    "Speech": "Habla",
    "Cue Voice": "Cue Voice",
    "Main Voice": "Voz principal",
    "Appearance": "Apariencia",
    "Font Size (%)": "Tamaño de fuente (%)",
    "Theme": "Tema",
    "Default": "Defecto",
    "Light": "Ligero",
    "Dark": "Oscuro",
    "Locale": "Lugar",
    "Save Config": "Guardar configuración",
    "Tree": "Árbol",
    "Choose an example tree": "Elige un árbol de ejemplo",
    "Pragmatic Phrases": "Frases pragmáticas",
    "Spell by blocks": "Hechizo por bloques",
    "Spell by blocks in Frequency": "Hechizo por bloques en Frecuencia",
    "Load Selected": "Defecto de carga",
    "Revert": "revertir",
    "Save Tree": "Guardar árbol",
    "Back option for all branches": "Opción trasera para todas las sucursales.",
    "Switch key to select items": "Tecla de cambio para seleccionar artículos",
    "Move with the other switch (Step scanning)": "Mover con el otro interruptor (Escaneo de pasos)",
    "Export": "Exportar",
    "Import": "Importar",
    "New": "Nuevo",
    "Delete": "Borrar",
    "Helpers": "Ayudantes",
    "English (UK)": "Inglés del Reino Unido)",
    "German": "alemán",
    "Arabic": "Arábica",
    "Spanish": "Español",
    "Gujarati": "Gujarati",
    "Grey-Red": "Gris rojo",
    "Yellow-Black": "Amarillo-negro",
    "Black-Yellow": "Amarillo negro",
    "Mint": "menta",
    "Active Tree": "Árbol activo",
    "French": "francés",
    "Jokes": "Chistes",
    "Adult Starter": "Arranque adulto",
    "Simple Adult Starter": "Arrancador simple para adultos",
    "Simple Adult Starter - Chinese Main": "Arrancador Adulto Simple - Chino Principal",
    "Welsh": "galés",
    "Light-Bold": "Light-Bold",
    "Spell by Word/Letter Prediction": "Hechizo por palabra / letra predicción",
    "Access": "Acceso",
    "Vocabulary": "Vocabulario",
    "Tools": "Herramientas",
    "Edit tree": "Editar árbol",
    "At beginning": "Al principio",
    "At end": "Al final",
    "None": "Ninguna",
    "Minimum Cue Time(ms)": "Tiempo mínimo de señal (ms)",
    "Scrollwheel": "Rueda de desplazamiento",
    "1 switch - Auto-Scan": "1 interruptor - Escaneo automático",
    "2+ Switches": "2+ interruptores",
    "Only for auto-scan access mode": "Solo para el modo de acceso de escaneo automático",
    "On": "En",
    "Select Item": "Seleccione un artículo",
    "Go Back": "Regresa",
    "Move to Next": "Mover al siguiente",
    "Move to Previous": "Mover a anterior"
};

  document.dispatchEvent(new CustomEvent('x-icu-changed', { detail: icu }))
})();
