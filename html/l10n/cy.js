(function() {

	var dfs = {"am_pm":["AM","PM"],"day_name":[ "Dydd Sul ",  "Dydd Llun ",  "Dydd Mawrth",  "Dydd Mercher",  "Dydd Iau ",  "dydd Gwener ",  "dydd Sadwrn "],"day_short":[ "Sun ",  "Llun ",  "Tue ",  "wed ",  "thu ",  "Gwener ",  "sat "],"era":["BC","AD"],"era_name":["Before Christ","Anno Domini"],"month_name":[ "Ionawr ",  "Chwefror ",  "Mawrth ",  "Ebrill ",  "may ",  "Mehefin ",  "Gorffennaf ",  "Awst ",  "Medi ",  "Hydref",  "Tachwedd",  "Rhagfyr"],"month_short":["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],"order_full":"DMY","order_long":"DMY","order_medium":"DMY","order_short":"DMY"};
	var nfs = {"decimal_separator":"٫","grouping_separator":"٬","minus":"-"};
	var df = {SHORT_PADDED_CENTURY:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1)+'/'+d.getFullYear());}},SHORT:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1)+'/'+(d.getFullYear()+'').substring(2));}},SHORT_NOYEAR:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1));}},SHORT_NODAY:function(d){if(d){return(((d.getMonth()+101)+'').substring(1)+'/'+(d.getFullYear()+'').substring(2));}},MEDIUM:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1)+'/'+d.getFullYear());}},MEDIUM_NOYEAR:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1));}},MEDIUM_WEEKDAY_NOYEAR:function(d){if(d){return(dfs.day_short[d.getDay()]+' '+((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1));}},LONG_NODAY:function(d){if(d){return(dfs.month_name[d.getMonth()]+','+' '+d.getFullYear());}},LONG:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+' '+dfs.month_name[d.getMonth()]+','+' '+d.getFullYear());}},FULL:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+' '+dfs.month_name[d.getMonth()]+','+' '+d.getFullYear());}}};
	
	window.icu = window.icu || new Object();
	var icu = window.icu;	
		
	icu.getCountry = function() { return "CY" };
	icu.getCountryName = function() { return "Wales" };
	icu.getDateFormat = function(formatCode) { var retVal = {}; retVal.format = df[formatCode]; return retVal; };
	icu.getDateFormats = function() { return df; };
	icu.getDateFormatSymbols = function() { return dfs; };
	icu.getDecimalFormat = function(places) { var retVal = {}; retVal.format = function(n) { var ns = n < 0 ? Math.abs(n).toFixed(places) : n.toFixed(places); var ns2 = ns.split('.'); s = ns2[0]; var d = ns2[1]; var rgx = /(\d+)(\d{3})/;while(rgx.test(s)){s = s.replace(rgx, '$1' + nfs["grouping_separator"] + '$2');} return (n < 0 ? nfs["minus"] : "") + s + nfs["decimal_separator"] + d;}; return retVal; };
	icu.getDecimalFormatSymbols = function() { return nfs; };
	icu.getIntegerFormat = function() { var retVal = {}; retVal.format = function(i) { var s = i < 0 ? Math.abs(i).toString() : i.toString(); var rgx = /(\d+)(\d{3})/;while(rgx.test(s)){s = s.replace(rgx, '$1' + nfs["grouping_separator"] + '$2');} return i < 0 ? nfs["minus"] + s : s;}; return retVal; };
	icu.getLanguage = function() { return "cy" };
	icu.getLanguageName = function() { return "Welsh" };
	icu.getLocale = function() { return "cy" };
	icu.getLocaleName = function() { return "Welsh" };

  icu.rtl = false;
  icu.dictionary = {
    "help_title": "PASCO - Help",
    "Toggle navigation": "Toggle llywio",
    "Start": "Dechrau",
    "CONTRIBUTORS": "Cyfranwyr",
    "COPYRIGHT": "Hawlfraint",
    "Copyright info": "Gwybodaeth hawlfraint",
    "Techs": "Technegau",
    "Web Responsive Voice": "Llais Ymatebol Gwe",
    "Configure": "Ffurfweddu",
    "Help": "Help",
    "Edit Mode": "Golygu Modd",
    "Save": "Arbed",
    "Cancel": "Diddymu",
    "Clear Storage": "Storio clir",
    "Setting": "Gosod",
    "Record Audio": "Record Sain",
    "record_btn_desc": "Dewiswch y targed ar gyfer cofnodi a thrwy gadw record botwm cofnod yn dechrau. Trwy ei ryddhau bydd y cofnod yn cael ei ychwanegu",
    "For": "Am",
    "Both": "Y ddau",
    "Main": "Prif Llais",
    "Cue": "Ciw",
    "Record": "Cofnod",
    "Audio List": "Rhestr Sain",
    "Close": "Yn agos",
    "config_title": "pasco - Cyfluniad",
    "Configuration": "Ffurfweddiad",
    "Settings": "Gosodiadau",
    "On-Screen Navigation": "Llywio ar y Sgrin",
    "Auto": "Auto",
    "Enable": "Galluogi",
    "Disable": "Analluoga",
    "Switch Access": "Newid Mynediad",
    "Automatic-Scanning": "Sganio Awtomatig",
    "Manual": "Llawlyfr",
    "Loops": "Blychau",
    "Delay at first item (ms)": "Oedi yn yr eitem gyntaf (ms)",
    "Auto-scanning delay (ms)": "Oedi Sganio Auto (ms)",
    "Switch Key to move forward": "Newid allwedd i symud ymlaen",
    "First Time Run (Cue Voice)": "Rhedeg Amser Cyntaf (Cue Voice)",
    "Voice": "Llais",
    "Volume": "Cyfrol",
    "Pitch": "Pitch",
    "Using a keyboard: Hitting 1 will go to previous and 2 to next. Also keys W/S, Up/Down arrow will work to navigate the tree": "Defnyddio bysellfwrdd: Bydd Hiting 1 yn mynd i flaenorol a 2 i'r nesaf. Hefyd yn allweddi C / S, bydd saeth i fyny / i lawr yn gweithio i lywio'r goeden",
    "Switch key to move forward": "Newid allwedd i symud ymlaen",
    "Ignore second hits(ms)": "Anwybyddwch ail hits (ms)",
    "Ignore key presses under n ms": "Anwybyddwch wasgiau allweddol o dan n ms",
    "Speech": "Araith",
    "Cue Voice": "Cue Voice",
    "Main Voice": "Prif Llais",
    "Appearance": "Ymddangosiad",
    "Font Size (%)": "Maint y Ffont (%)",
    "Theme": "Thema",
    "Default": "Diofyn",
    "Light": "Golau",
    "Dark": "Tywyll",
    "Locale": "Locale",
    "Save Config": "Cadw Config",
    "Tree": "Coed",
    "Choose an example tree": "Dewiswch goeden ddiofyn",
    "Pragmatic Phrases": "Ymadroddion Pragmatig",
    "Spell by blocks": "Sillafu fesul blociau",
    "Spell by blocks in Frequency": "Sillafu mewn blociau yn Amlder",
    "Load Selected": "Llwyth Dethol",
    "Revert": "Dychwelyd",
    "Save Tree": "Arbed Coed",
    "Back option for all branches": "Yn ôl i'r holl ganghennau",
    "Switch key to select items": "Newid allwedd i ddewis eitemau",
    "Move with the other switch (Step scanning)": "Symudwch gyda'r switsh arall (sganio cam)",
    "Export": "Allforio",
    "Import": "Mewnforio",
    "New": "Newydd",
    "Delete": "Dileu",
    "Helpers": "Helpwyr",
    "English (UK)": "Saesneg (DU)",
    "German": "Almaeneg",
    "Arabic": "Arabeg",
    "Spanish": "Sbaeneg",
    "Gujarati": "Gwjarati",
    "Grey-Red": "Llwyd-Coch",
    "Yellow-Black": "Melyn-Du",
    "Black-Yellow": "Du-Du",
    "Mint": "Mint",
    "Active Tree": "Coed Actif",
    "French": "Ffrangeg",
    "Jokes": "Jôcs",
    "Adult Starter": "Dechreuwr Oedolion",
    "Simple Adult Starter": "Cychwyn Cychwynnol Oedolion",
    "Simple Adult Starter - Chinese Main": "Dechreuwr Oedolion Syml - Prif Dseiniaidd",
    "Welsh": "Cymraeg",
    "Light-Bold": "Golau-Bold",
    "Spell by Word/Letter Prediction": "Sillafu yn ôl Word / Letter Prediction",
    "Access": "Mynediad",
    "Vocabulary": "Geirfa",
    "Tools": "Offer",
    "Edit tree": "Golygu coeden",
    "At beginning": "Ar y dechrau",
    "At end": "Ar y diwedd",
    "None": "Dim",
    "Minimum Cue Time(ms)": "Isafswm Amser Ciw (ms)",
    "Scrollwheel": "Scrollwheel",
    "1 switch - Auto-Scan": "1 switsh - Auto-Sgan",
    "2+ Switches": "2+ Switsys",
    "Only for auto-scan access mode": "Dim ond ar gyfer modd mynediad auto-sgan",
    "On": "Ymlaen",
    "Select Item": "Dewiswch Eitem",
    "Go Back": "Mynd yn ôl",
    "Move to Next": "Symud i'r Nesaf",
    "Move to Previous": "Symud i Blaenorol"
};

})();
