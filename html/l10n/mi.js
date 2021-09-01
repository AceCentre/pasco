(function() {
	var dfs = {"am_pm": ["AM", "PM"], "day_name": ["Ratapu", "Mane", "Turei", "Wenerei", "Taite", "Paraire", "Hatarei" ], "day_short": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], "era": ["BC", "AD"], "era_name": ["I mua i a te Karaiti", "Anno Domini"], "month_name": ["Hanuere", "Pepuere", "Poutu-te-rangi", "Aperira", "Mei", "Pipiri", "Hurae", " Akuhata "," Hepetema "," Oketopa "," Noema "," Tihema "]," month_short ": [" Jan "," Feb "," Mar "," Apr "," May "," Jun "," Jul "," Aug "," Sep "," Oct "," Nov "," Dec "]," order_full ":" DMY "," order_long ":" DMY "," order_ Medium ":" DMY "," order_short ":" DMY "};
	var dfs = {"am_pm":["AM","PM"],"day_name":["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],"day_short":["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],"era":["BC","AD"],"era_name":["Before Christ","Anno Domini"],"month_name":["Hanuere", "Pepuere", "Maehe", "Aperira", "Mei", "Pipiri", "Hurae", "Akuhata", "Hepetema", "Oketopa", "Noema", "Tihema"],"month_short":["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],"order_full":"DMY","order_long":"DMY","order_medium":"DMY","order_short":"DMY"};
	var nfs = {"decimal_separator":".","grouping_separator":",","minus":"-"};
	var df = {SHORT_PADDED_CENTURY:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1)+'/'+d.getFullYear());}},SHORT:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1)+'/'+(d.getFullYear()+'').substring(2));}},SHORT_NOYEAR:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1));}},SHORT_NODAY:function(d){if(d){return(((d.getMonth()+101)+'').substring(1)+'/'+(d.getFullYear()+'').substring(2));}},MEDIUM:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'-'+dfs.month_short[d.getMonth()]+'-'+d.getFullYear());}},MEDIUM_NOYEAR:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'-'+dfs.month_short[d.getMonth()]);}},MEDIUM_WEEKDAY_NOYEAR:function(d){if(d){return(dfs.day_short[d.getDay()]+' '+((d.getDate()+101)+'').substring(1)+'-'+dfs.month_short[d.getMonth()]);}},LONG_NODAY:function(d){if(d){return(dfs.month_name[d.getMonth()]+' '+d.getFullYear());}},LONG:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+' '+dfs.month_name[d.getMonth()]+' '+d.getFullYear());}},FULL:function(d){if(d){return(dfs.day_name[d.getDay()]+','+' '+d.getDate()+' '+dfs.month_name[d.getMonth()]+' '+d.getFullYear());}}};
	
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
	icu.getLanguage = function() { return "ar" };
	icu.getLanguageName = function() { return "العربية" };
	icu.getLocale = function() { return "ar" };
	icu.getLocaleName = function() { return "العربية" };

  icu.rtl = false;
  icu.dictionary = {
    "help_title": "PASCO - Awhina",
    "Toggle navigation": "Takahuri whakaterenga",
    "Start": "Timata",
    "CONTRIBUTORS": "Tuhinga o mua",
    "COPYRIGHT": "PANUITANGA",
    "Copyright info": "Mōhiohio manatārua",
    "Techs": "Hangarau",
    "Web Responsive Voice": "Reo Urupare Paetukutuku",
    "Configure": "Whirihorahia",
    "Help": "Awhina",
    "Edit Mode": "Aratau Whakatika",
    "Save": "Penapena",
    "Cancel": "Whakakore",
    "Clear Storage": "Maama Rokiroki",
    "Setting": "Whakatakoto",
    "Record Audio": "Tuhia te Ororongo",
    "record_btn_desc": "record_btn_desc",
    "For": "Mo te",
    "Both": "Rua",
    "Main": "Matua",
    "Cue": "Tohu",
    "Record": "Tuhia",
    "Audio List": "Rarangi Ororongo",
    "Close": "Katia",
    "config_title": "Whirihoranga",
    "Configuration": "Whirihoranga",
    "Settings": "Tautuhinga",
    "On-Screen Navigation": "Whakatere-a-Mata",
    "Auto": "Aunoa",
    "Enable": "Whakahohea",
    "Disable": "Monokia",
    "Switch Access": "Whakawhiti Uru",
    "Automatic-Scanning": "Matawai-Aunoa",
    "Manual": "Manual",
    "Loops": "Koromeke",
    "Delay at first item (ms)": "Taihoa i te tuemi tuatahi (ms)",
    "Auto-scanning delay (ms)": "Te whakaroa matawai-aunoa (ms)",
    "Switch Key to move forward": "Whakawhiti Kī kia anga whakamua",
    "First Time Run (Cue Voice)": "Rere Tuatahi (Tohu Tohu)",
    "Voice": "Reo",
    "Volume": "Volume",
    "Pitch": "Tuitui",
    "Using a keyboard: Hitting 1 will go to previous and 2 to next. Also keys W/S, Up/Down arrow will work to navigate the tree": "Ma te whakamahi i te papapātuhi: Ko te patu 1 ka haere ki mua me te 2 ki muri. Me nga taviri W / S, Ake / Raro te pere ka mahi hei whakatere i te rakau",
    "Switch key to move forward": "Whakawhiti kī kia anga whakamua",
    "Ignore second hits(ms)": "Waiho nga whakautu tuarua (ms)",
    "Ignore key presses under n ms": "Waiho nga perehi matua i raro i te n ms",
    "Speech": "Korero",
    "Cue Voice": "Reo Tohu",
    "Main Voice": "Reo Matua",
    "Appearance": "Te Ahua",
    "Font Size (%)": "Rahinga Momotuhi (%)",
    "Theme": "Kaupapa",
    "Default": "Taunoa",
    "Light": "Rama",
    "Dark": "Pouri",
    "Locale": "Tauwāhi",
    "Save Config": "Tiaki Whirihora",
    "Tree": "Rākau",
    "Choose an example tree": "Tohua he tauira rakau",
    "Pragmatic Phrases": "Kīanga Panui",
    "Spell by blocks": "Te takikupu ma nga poraka",
    "Spell by blocks in Frequency": "Tuhia ma nga poraka i te Auautanga",
    "Load Selected": "Kua utaina nga utanga",
    "Revert": "Whakahoki",
    "Save Tree": "Whakaora Rākau",
    "Back option for all branches": "He kowhiringa hoki mo nga peka katoa",
    "Switch key to select items": "Whakawhitia te tohu ki te tohu i nga taonga",
    "Move with the other switch (Step scanning)": "Nuku me tetahi atu pana (Matawai taahiraa)",
    "Export": "Kaweake",
    "Import": "Kawemai",
    "New": "Hou",
    "Delete": "Mukua",
    "Helpers": "Kaiawhina",
    "English (UK)": "Ingarihi (UK)",
    "German": "Tiamana",
    "Arabic": "Arapi",
    "Spanish": "Paniora",
    "Gujarati": "Gujarati",
    "Grey-Red": "Kerei-Whero",
    "Yellow-Black": "Kōwhai-Pango",
    "Black-Yellow": "Pango-kowhai",
    "Mint": "Mint",
    "Active Tree": "Rakau Hohe",
    "French": "Wiwi",
    "Jokes": "Katakata",
    "Adult Starter": "Te tiimatanga o nga pakeke",
    "Simple Adult Starter": "He tiimatanga Pakeke Maama",
    "Simple Adult Starter - Chinese Main": "He tiimatanga Pakeke Maamaa - Matua Hainamana",
    "Welsh": "Wales",
    "Light-Bold": "Maama-Maaha",
    "Spell by Word/Letter Prediction": "Ororongo na te Matapae Kupu / Reta",
    "Access": "Whakauru",
    "Vocabulary": "Papakupu",
    "Tools": "Utauta",
    "Edit tree": "Whakatika rakau",
    "At beginning": "I te timatanga",
    "At end": "I te mutunga",
    "None": "Kore",
    "Minimum Cue Time(ms)": "Te Wa Tohu Iti (ms)",
    "Scrollwheel": "Hurihuri",
    "1 switch - Auto-Scan": "1 pana - Matawai Aunoa",
    "2+ Switches": "2+ Whakawhitinga",
    "Only for auto-scan access mode": "Anake mo te aratau urunga matawai-aunoa",
    "On": "Kei",
    "Select Item": "Tīpako Tūemi",
    "Go Back": "Hoki Hoki",
    "Move to Next": "Nuku ki Panuku",
    "Move to Previous": "Nuku ki Mua",
    "Dropbox Sync": "Tukutahi Dropbox",
    "Edit Tree": "Whakatika Rākau",
    "Stay in branches for all nodes": "Me noho ki nga peka mo nga kōpuku katoa",
    "Stay in branch for all nodes": "Me noho manga ki nga pona katoa",
    "Cue Speech": "Korero Korero",
    "Main Speech": "Korero Matua",
    "Notify Back on Select": "Whakamōhiohia Hoki i runga i te Tīpakonga",
    "Configure Actions": "Whirihorahia nga Hohenga",
    "Sync": "Tukutahi"
};

})();