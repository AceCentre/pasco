(function() {

	var dfs = {"am_pm":["AM","PM"],"day_name":["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],"day_short":["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],"era":["BC","AD"],"era_name":["Before Christ","Anno Domini"],"month_name":["January","February","March","April","May","June","July","August","September","October","November","December"],"month_short":["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],"order_full":"DMY","order_long":"DMY","order_medium":"DMY","order_short":"DMY"};
	var nfs = {"decimal_separator":".","grouping_separator":",","minus":"-"};
	var df = {SHORT_PADDED_CENTURY:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1)+'/'+d.getFullYear());}},SHORT:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1)+'/'+(d.getFullYear()+'').substring(2));}},SHORT_NOYEAR:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1));}},SHORT_NODAY:function(d){if(d){return(((d.getMonth()+101)+'').substring(1)+'/'+(d.getFullYear()+'').substring(2));}},MEDIUM:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'-'+dfs.month_short[d.getMonth()]+'-'+d.getFullYear());}},MEDIUM_NOYEAR:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'-'+dfs.month_short[d.getMonth()]);}},MEDIUM_WEEKDAY_NOYEAR:function(d){if(d){return(dfs.day_short[d.getDay()]+' '+((d.getDate()+101)+'').substring(1)+'-'+dfs.month_short[d.getMonth()]);}},LONG_NODAY:function(d){if(d){return(dfs.month_name[d.getMonth()]+' '+d.getFullYear());}},LONG:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+' '+dfs.month_name[d.getMonth()]+' '+d.getFullYear());}},FULL:function(d){if(d){return(dfs.day_name[d.getDay()]+','+' '+d.getDate()+' '+dfs.month_name[d.getMonth()]+' '+d.getFullYear());}}};
	
	window.icu = window.icu || new Object();
	var icu = window.icu;	
		
	icu.getCountry = function() { return "YI" };
	icu.getCountryName = function() { return "Yiddish" };
	icu.getDateFormat = function(formatCode) { var retVal = {}; retVal.format = df[formatCode]; return retVal; };
	icu.getDateFormats = function() { return df; };
	icu.getDateFormatSymbols = function() { return dfs; };
	icu.getDecimalFormat = function(places) { var retVal = {}; retVal.format = function(n) { var ns = n < 0 ? Math.abs(n).toFixed(places) : n.toFixed(places); var ns2 = ns.split('.'); s = ns2[0]; var d = ns2[1]; var rgx = /(\d+)(\d{3})/;while(rgx.test(s)){s = s.replace(rgx, '$1' + nfs["grouping_separator"] + '$2');} return (n < 0 ? nfs["minus"] : "") + s + nfs["decimal_separator"] + d;}; return retVal; };
	icu.getDecimalFormatSymbols = function() { return nfs; };
	icu.getIntegerFormat = function() { var retVal = {}; retVal.format = function(i) { var s = i < 0 ? Math.abs(i).toString() : i.toString(); var rgx = /(\d+)(\d{3})/;while(rgx.test(s)){s = s.replace(rgx, '$1' + nfs["grouping_separator"] + '$2');} return i < 0 ? nfs["minus"] + s : s;}; return retVal; };
	icu.getLanguage = function() { return "yi" };
	icu.getLanguageName = function() { return "Yiddish" };
	icu.getLocale = function() { return "yi" };
	icu.getLocaleName = function() { return "Yiddish" };

  icu.rtl = true;
  icu.dictionary = {
    "help_title": "הילף_טיטל",
    "Toggle navigation": "באַשטימען נאַוויגאַציע",
    "Start": "אָנהייב",
    "CONTRIBUTORS": "מיטארבעטערס",
    "COPYRIGHT": "קאַפּירייט",
    "Copyright info": "דרוקרעכט אינפֿאָרמאַציע",
    "Techs": "טעטשס",
    "Web Responsive Voice": "וועב אָפּרופיק קול",
    "Configure": "קאָנפיגורירן",
    "Help": "הילף",
    "Edit Mode": "רעדאַגירן מאָדע",
    "Save": "היט",
    "Cancel": "באָטל מאַכן",
    "Clear Storage": "קלאָר סטאָרידזש",
    "Setting": "באַשטעטיקן",
    "Record Audio": "רעקאָרד אַודיאָ",
    "record_btn_desc": "record_btn_desc",
    "For": "פֿאַר",
    "Both": "ביידע",
    "Main": "הויפּט",
    "Cue": "קיו",
    "Record": "רעקאָרד",
    "Audio List": "אַודיאָ רשימה",
    "Close": "נאָענט",
    "config_title": "config_title",
    "Configuration": "קאָנפיגוראַטיאָן",
    "Settings": "סעטטינגס",
    "On-Screen Navigation": "אויף-סקרין נאַוויגאַציע",
    "Auto": "אַוטאָ",
    "Enable": "געבן",
    "Disable": "דיסייבאַל",
    "Switch Access": "באַשטימען אַקסעס",
    "Automatic-Scanning": "אָטאַמאַטיק סקאַנינג",
    "Manual": "מאַנואַל",
    "Loops": "שלייף",
    "Delay at first item (ms)": "פאַרהאַלטן ביי ערשטער נומער (מס)",
    "Auto-scanning delay (ms)": "אָטאַמאַטיק סקאַנינג פאַרהאַלטן (ms)",
    "Switch Key to move forward": "באַשטימען שליסל צו פאָרויס",
    "First Time Run (Cue Voice)": "ערשטער מאָל לויפן (קיו קול)",
    "Voice": "קול",
    "Volume": "באַנד",
    "Pitch": "פּעך",
    "Using a keyboard: Hitting 1 will go to previous and 2 to next. Also keys W/S, Up/Down arrow will work to navigate the tree": "ניצן אַ קלאַוויאַטור: היטטינג 1 וועט גיין צו די פריערדיקע און 2 צו דער ווייַטער. אויך שליסלען וו / ס, אַרויף / אַראָפּ פייַל וועט אַרבעטן צו נאַוויגירן דעם בוים",
    "Switch key to move forward": "באַשטימען שליסל צו פאָרויס",
    "Ignore second hits(ms)": "איגנאָרירן רגע היץ (ms)",
    "Ignore key presses under n ms": "איגנאָרירן שליסל דריקט אונטער n ms",
    "Speech": "רייד",
    "Cue Voice": "קיו קול",
    "Main Voice": "הויפּט קול",
    "Appearance": "אויסזען",
    "Font Size (%)": "שריפֿט גרייס (%)",
    "Theme": "טעמע",
    "Default": "פעליקייַט",
    "Light": "ליכט",
    "Dark": "טונקל",
    "Locale": "לאקאלע",
    "Save Config": "היט קאָנפיג",
    "Tree": "בוים",
    "Choose an example tree": "קלייַבן אַ בייַשפּיל בוים",
    "Pragmatic Phrases": "פּראַגמאַטיק פראַסעס",
    "Spell by blocks": "רעגע דורך בלאַקס",
    "Spell by blocks in Frequency": "רעגע דורך בלאַקס אין אָפטקייַט",
    "Load Selected": "לאָדן אויסגעקליבן",
    "Revert": "צוריקקומען",
    "Save Tree": "היט טרי",
    "Back option for all branches": "צוריק אָפּציע פֿאַר אַלע צווייגן",
    "Switch key to select items": "באַשטימען שליסל צו אויסקלייַבן זאכן",
    "Move with the other switch (Step scanning)": "מאַך מיט די אנדערע באַשטימען (סטעפּ סקאַנינג)",
    "Export": "עקספּאָרט",
    "Import": "אַרייַנפיר",
    "New": "נייַ",
    "Delete": "ויסמעקן",
    "Helpers": "העלפערס",
    "English (UK)": "ענגליש (UK)",
    "German": "דײַטש",
    "Arabic": "אַראַביש",
    "Spanish": "שפּאַניש",
    "Gujarati": "גודזשאַראַטי",
    "Grey-Red": "גרוי-רויט",
    "Yellow-Black": "געל-שוואַרץ",
    "Black-Yellow": "שוואַרץ-געל",
    "Mint": "מינץ",
    "Active Tree": "אַקטיוו טרי",
    "French": "פראנצויזיש",
    "Jokes": "דזשאָוקס",
    "Adult Starter": "אַדאַלט סטאַרטער",
    "Simple Adult Starter": "פּשוט אַדאַלט סטאַרטער",
    "Simple Adult Starter - Chinese Main": "פּשוט אַדאַלט סטאַרטער - כינעזיש הויפּט",
    "Welsh": "וועלש",
    "Light-Bold": "ליכט-באָלד",
    "Spell by Word/Letter Prediction": "רעגע דורך וואָרט / בריוו פּראָגנאָז",
    "Access": "אַקסעס",
    "Vocabulary": "וואָקאַבולאַרי",
    "Tools": "מכשירים",
    "Edit tree": "רעדאַגירן בוים",
    "At beginning": "אין אָנהייב",
    "At end": "אין סוף",
    "None": "קיינער",
    "Minimum Cue Time(ms)": "מינימום קיו צייט (מס)",
    "Scrollwheel": "סקראָלווהעעל",
    "1 switch - Auto-Scan": "1 באַשטימען - אַוטאָ-סקאַן",
    "2+ Switches": "2+ סוויטשאַז",
    "Only for auto-scan access mode": "בלויז פֿאַר אַוטאָ יבערקוקן אַקסעס מאָדע",
    "On": "אויף",
    "Select Item": "אויסקלייַבן נומער",
    "Go Back": "גיי צוריק",
    "Move to Next": "מאַך צו ווייַטער",
    "Move to Previous": "מאַך צו פריער",
    "Dropbox Sync": "דראָפּבאָקס סינק",
    "Edit Tree": "רעדאַגירן טרי",
    "Stay in branches for all nodes": "בלייבן אין צווייגן פֿאַר אַלע נאָודז",
    "Stay in branch for all nodes": "בלייבן אין צווייַג פֿאַר אַלע נאָודז",
    "Cue Speech": "קיו ספּיטש",
    "Main Speech": "הויפּט רעדע",
    "Notify Back on Select": "געבנ צו וויסן צוריק אויף סעלעקט",
    "Configure Actions": "קאַנפיגיער אַקשאַנז",
    "Sync": "סינק"
};

  document.dispatchEvent(new CustomEvent('x-icu-changed', { detail: icu }))
})();
