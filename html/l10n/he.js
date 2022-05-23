(function() {

	var dfs = {"am_pm":["AM","PM"],"day_name":["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],"day_short":["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],"era":["BC","AD"],"era_name":["Before Christ","Anno Domini"],"month_name":["January","February","March","April","May","June","July","August","September","October","November","December"],"month_short":["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],"order_full":"DMY","order_long":"DMY","order_medium":"DMY","order_short":"DMY"};
	var nfs = {"decimal_separator":".","grouping_separator":",","minus":"-"};
	var df = {SHORT_PADDED_CENTURY:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1)+'/'+d.getFullYear());}},SHORT:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1)+'/'+(d.getFullYear()+'').substring(2));}},SHORT_NOYEAR:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1));}},SHORT_NODAY:function(d){if(d){return(((d.getMonth()+101)+'').substring(1)+'/'+(d.getFullYear()+'').substring(2));}},MEDIUM:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'-'+dfs.month_short[d.getMonth()]+'-'+d.getFullYear());}},MEDIUM_NOYEAR:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'-'+dfs.month_short[d.getMonth()]);}},MEDIUM_WEEKDAY_NOYEAR:function(d){if(d){return(dfs.day_short[d.getDay()]+' '+((d.getDate()+101)+'').substring(1)+'-'+dfs.month_short[d.getMonth()]);}},LONG_NODAY:function(d){if(d){return(dfs.month_name[d.getMonth()]+' '+d.getFullYear());}},LONG:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+' '+dfs.month_name[d.getMonth()]+' '+d.getFullYear());}},FULL:function(d){if(d){return(dfs.day_name[d.getDay()]+','+' '+d.getDate()+' '+dfs.month_name[d.getMonth()]+' '+d.getFullYear());}}};
	
	window.icu = window.icu || new Object();
	var icu = window.icu;	
		
	icu.getCountry = function() { return "HE" };
	icu.getCountryName = function() { return "Hebrew" };
	icu.getDateFormat = function(formatCode) { var retVal = {}; retVal.format = df[formatCode]; return retVal; };
	icu.getDateFormats = function() { return df; };
	icu.getDateFormatSymbols = function() { return dfs; };
	icu.getDecimalFormat = function(places) { var retVal = {}; retVal.format = function(n) { var ns = n < 0 ? Math.abs(n).toFixed(places) : n.toFixed(places); var ns2 = ns.split('.'); s = ns2[0]; var d = ns2[1]; var rgx = /(\d+)(\d{3})/;while(rgx.test(s)){s = s.replace(rgx, '$1' + nfs["grouping_separator"] + '$2');} return (n < 0 ? nfs["minus"] : "") + s + nfs["decimal_separator"] + d;}; return retVal; };
	icu.getDecimalFormatSymbols = function() { return nfs; };
	icu.getIntegerFormat = function() { var retVal = {}; retVal.format = function(i) { var s = i < 0 ? Math.abs(i).toString() : i.toString(); var rgx = /(\d+)(\d{3})/;while(rgx.test(s)){s = s.replace(rgx, '$1' + nfs["grouping_separator"] + '$2');} return i < 0 ? nfs["minus"] + s : s;}; return retVal; };
	icu.getLanguage = function() { return "he" };
	icu.getLanguageName = function() { return "Hebrew" };
	icu.getLocale = function() { return "he" };
	icu.getLocaleName = function() { return "Hebrew" };

  icu.rtl = true;
  icu.dictionary = {
    "help_title": "help_title",
    "Toggle navigation": "החלף ניווט",
    "Start": "הַתחָלָה",
    "CONTRIBUTORS": "תורמים",
    "COPYRIGHT": "זכויות יוצרים",
    "Copyright info": "מידע על זכויות יוצרים",
    "Techs": "טכניקות",
    "Web Responsive Voice": "קול רספונסיבי לאינטרנט",
    "Configure": "הגדר",
    "Help": "עֶזרָה",
    "Edit Mode": "מצב עריכה",
    "Save": "להציל",
    "Cancel": "לְבַטֵל",
    "Clear Storage": "פנה אחסון",
    "Setting": "הגדרה",
    "Record Audio": "הקלט אודיו",
    "record_btn_desc": "record_btn_desc",
    "For": "ל",
    "Both": "שניהם",
    "Main": "רָאשִׁי",
    "Cue": "רְמִיזָה",
    "Record": "תקליט",
    "Audio List": "רשימת אודיו",
    "Close": "סגור",
    "config_title": "config_title",
    "Configuration": "תְצוּרָה",
    "Settings": "הגדרות",
    "On-Screen Navigation": "ניווט על המסך",
    "Auto": "אוטומטי",
    "Enable": "לְאַפשֵׁר",
    "Disable": "השבת",
    "Switch Access": "גישה באמצעות מתג",
    "Automatic-Scanning": "סריקה אוטומטית",
    "Manual": "מדריך ל",
    "Loops": "לולאות",
    "Delay at first item (ms)": "עיכוב בפריט ראשון (ms)",
    "Auto-scanning delay (ms)": "עיכוב סריקה אוטומטית (ms)",
    "Switch Key to move forward": "מקש החלף כדי להתקדם",
    "First Time Run (Cue Voice)": "ריצה ראשונה (קול קיו)",
    "Voice": "קוֹל",
    "Volume": "כרך",
    "Pitch": "גובה הצליל",
    "Using a keyboard: Hitting 1 will go to previous and 2 to next. Also keys W/S, Up/Down arrow will work to navigate the tree": "שימוש במקלדת: לחיצה על 1 תעבור לקודם ו-2 לבא. גם המקשים W/S, חץ למעלה/למטה יעבדו כדי לנווט בעץ",
    "Switch key to move forward": "מקש החלף כדי להתקדם",
    "Ignore second hits(ms)": "התעלם ממגיעות שניות (ms)",
    "Ignore key presses under n ms": "התעלם מלחיצות מקשים תחת n ms",
    "Speech": "נְאוּם",
    "Cue Voice": "קול רמז",
    "Main Voice": "קול ראשי",
    "Appearance": "מראה חיצוני",
    "Font Size (%)": "גודל גופן (%)",
    "Theme": "נושא",
    "Default": "בְּרִירַת מֶחדָל",
    "Light": "אוֹר",
    "Dark": "אפל",
    "Locale": "מקום",
    "Save Config": "שמור תצורה",
    "Tree": "עֵץ",
    "Choose an example tree": "בחר עץ לדוגמה",
    "Pragmatic Phrases": "ביטויים פרגמטיים",
    "Spell by blocks": "איות לפי בלוקים",
    "Spell by blocks in Frequency": "איות לפי בלוקים בתדר",
    "Load Selected": "טען נבחר",
    "Revert": "לַחֲזוֹר",
    "Save Tree": "שמור עץ",
    "Back option for all branches": "אפשרות חזרה לכל הסניפים",
    "Switch key to select items": "מקש מעבר לבחירת פריטים",
    "Move with the other switch (Step scanning)": "הזז עם המתג השני (סריקה שלב)",
    "Export": "יְצוּא",
    "Import": "יְבוּא",
    "New": "חָדָשׁ",
    "Delete": "לִמְחוֹק",
    "Helpers": "עוזרים",
    "English (UK)": "אנגלית בריטית)",
    "German": "גֶרמָנִיָת",
    "Arabic": "עֲרָבִית",
    "Spanish": "ספרדית",
    "Gujarati": "גוג'ראטי",
    "Grey-Red": "אפור-אדום",
    "Yellow-Black": "צהוב-שחור",
    "Black-Yellow": "שחור צהוב",
    "Mint": "מנטה",
    "Active Tree": "עץ פעיל",
    "French": "צָרְפָתִית",
    "Jokes": "בדיחות",
    "Adult Starter": "מנה ראשונה למבוגרים",
    "Simple Adult Starter": "מתנע פשוט למבוגרים",
    "Simple Adult Starter - Chinese Main": "מנה פשוטה למבוגרים - עיקרית סינית",
    "Welsh": "וולשית",
    "Light-Bold": "קל-מודגש",
    "Spell by Word/Letter Prediction": "איות לפי מילה/אות חיזוי",
    "Access": "גִישָׁה",
    "Vocabulary": "אוצר מילים",
    "Tools": "כלים",
    "Edit tree": "ערוך עץ",
    "At beginning": "בתחילה",
    "At end": "בסוף",
    "None": "אף אחד",
    "Minimum Cue Time(ms)": "זמן רמז מינימלי (ms)",
    "Scrollwheel": "גלגל גלילה",
    "1 switch - Auto-Scan": "מתג 1 - סריקה אוטומטית",
    "2+ Switches": "2+ מתגים",
    "Only for auto-scan access mode": "רק עבור מצב גישה לסריקה אוטומטית",
    "On": "עַל",
    "Select Item": "בחר פריט",
    "Go Back": "תחזור",
    "Move to Next": "עבור אל הבא",
    "Move to Previous": "עבור אל הקודם",
    "Dropbox Sync": "Dropbox Sync",
    "Edit Tree": "ערוך עץ",
    "Stay in branches for all nodes": "הישאר בסניפים עבור כל הצמתים",
    "Stay in branch for all nodes": "הישאר בסניף עבור כל הצמתים",
    "Cue Speech": "נאום רמז",
    "Main Speech": "נאום ראשי",
    "Notify Back on Select": "הודע חזרה בבחירה",
    "Configure Actions": "הגדר פעולות",
    "Sync": "סינכרון"
};

})();