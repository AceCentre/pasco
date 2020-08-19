(function() {

	var dfs = {"am_pm":["AM","PM"],"day_name":["اتوار","پیر","منگل","بدھ","جمعرات","جمعہ","ہفتہ"],"day_short":["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],"era":["BC","AD"],"era_name":["Before Christ","Anno Domini"],"month_name":["جنوری","فروری","مارچ","اپریل","مئی","جون","جولائی","اگست","ستمبر","اکتوبر","نومبر","دسمبر"],"month_short":["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],"order_full":"DMY","order_long":"DMY","order_medium":"DMY","order_short":"DMY"};
	
	var nfs = {"decimal_separator":"٫","grouping_separator":"٬","minus":"-"};
	var df = {SHORT_PADDED_CENTURY:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1)+'/'+d.getFullYear());}},SHORT:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1)+'/'+(d.getFullYear()+'').substring(2));}},SHORT_NOYEAR:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1));}},SHORT_NODAY:function(d){if(d){return(((d.getMonth()+101)+'').substring(1)+'/'+(d.getFullYear()+'').substring(2));}},MEDIUM:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1)+'/'+d.getFullYear());}},MEDIUM_NOYEAR:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1));}},MEDIUM_WEEKDAY_NOYEAR:function(d){if(d){return(dfs.day_short[d.getDay()]+' '+((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1));}},LONG_NODAY:function(d){if(d){return(dfs.month_name[d.getMonth()]+','+' '+d.getFullYear());}},LONG:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+' '+dfs.month_name[d.getMonth()]+','+' '+d.getFullYear());}},FULL:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+' '+dfs.month_name[d.getMonth()]+','+' '+d.getFullYear());}}};
	
	window.icu = window.icu || new Object();
	var icu = window.icu;	
		
	icu.getCountry = function() { return "URD" };
	icu.getCountryName = function() { return "" };
	icu.getDateFormat = function(formatCode) { var retVal = {}; retVal.format = df[formatCode]; return retVal; };
	icu.getDateFormats = function() { return df; };
	icu.getDateFormatSymbols = function() { return dfs; };
	icu.getDecimalFormat = function(places) { var retVal = {}; retVal.format = function(n) { var ns = n < 0 ? Math.abs(n).toFixed(places) : n.toFixed(places); var ns2 = ns.split('.'); s = ns2[0]; var d = ns2[1]; var rgx = /(\d+)(\d{3})/;while(rgx.test(s)){s = s.replace(rgx, '$1' + nfs["grouping_separator"] + '$2');} return (n < 0 ? nfs["minus"] : "") + s + nfs["decimal_separator"] + d;}; return retVal; };
	icu.getDecimalFormatSymbols = function() { return nfs; };
	icu.getIntegerFormat = function() { var retVal = {}; retVal.format = function(i) { var s = i < 0 ? Math.abs(i).toString() : i.toString(); var rgx = /(\d+)(\d{3})/;while(rgx.test(s)){s = s.replace(rgx, '$1' + nfs["grouping_separator"] + '$2');} return i < 0 ? nfs["minus"] + s : s;}; return retVal; };
	icu.getLanguage = function() { return "urd" };
	icu.getLanguageName = function() { return "Urdu" };
	icu.getLocale = function() { return "URD" };
	icu.getLocaleName = function() { return "العربية" };

  icu.rtl = false;
  icu.dictionary = {
   "help_title": "ہیلپ ٹائٹل",
    "Toggle navigation": "نیویگیشن ٹوگل کریں",
    "Start": "شروع کریں",
    "CONTRIBUTORS": "شراکت دار",
    "COPYRIGHT": "کاپی رائٹ",
    "Copyright info": "حق اشاعت کی معلومات",
    "Techs": "ٹیکس",
    "Web Responsive Voice": "ویب قبول آواز",
    "Configure": "تشکیل دیں",
    "Help": "مدد",
    "Edit Mode": "ترمیم موڈ",
    "Save": "محفوظ کریں",
    "Cancel": "منسوخ کریں",
    "Clear Storage": "واضح اسٹوریج",
    "Setting": "سیٹنگ",
    "Record Audio": "آڈیو ریکارڈ کریں",
    "record_btn_desc": "ریکارڈ_بی ٹی این_ڈیسک",
    "For": "کے لئے",
    "Both": "دونوں",
    "Main": "مرکزی",
    "Cue": "اشارہ",
    "Record": "ریکارڈ",
    "Audio List": "آڈیو فہرست",
    "Close": "بند کریں",
    "config_title": "config_title",
    "Configuration": "تشکیل",
    "Settings": "ترتیبات",
    "On-Screen Navigation": "آن اسکرین نیویگیشن",
    "Auto": "آٹو",
    "Enable": "فعال",
    "Disable": "غیر فعال کریں",
    "Switch Access": "سوئچ رسائی",
    "Automatic-Scanning": "خودکار اسکین کرنا",
    "Manual": "دستی",
    "Loops": "لوپس",
    "Delay at first item (ms)": "پہلی شے میں تاخیر (ایم ایس)",
    "Auto-scanning delay (ms)": "آٹو اسکیننگ میں تاخیر (ایم ایس)",
    "Switch Key to move forward": "آگے بڑھنے کے لئے کلید سوئچ کریں",
    "First Time Run (Cue Voice)": "پہلی بار چلائیں (کیو وائس)",
    "Voice": "آواز",
    "Volume": "حجم",
    "Pitch": "پچ",
    "Using a keyboard: Hitting 1 will go to previous and 2 to next. Also keys W/S, Up/Down arrow will work to navigate the tree": "کی بورڈ کا استعمال کرتے ہوئے: 1 کو ہٹانا پچھلے اور 2 سے اگلے پر جائیں گے۔ نیز ڈبلیو / ایس ، اپ / ڈاون تیر والے بٹن درخت کو نیویگیٹ کرنے کے لئے بھی کام کریں گے",
    "Switch key to move forward": "آگے بڑھنے کے لئے کلید سوئچ کریں",
    "Ignore second hits(ms)": "دوسری کامیابیاں (ایم ایس) کو نظرانداز کریں",
    "Ignore key presses under n ms": "کلیدی پریس کو این ایم ایس کے تحت نظر انداز کریں",
    "Speech": "تقریر",
    "Cue Voice": "کیو وائس",
    "Main Voice": "مین آواز",
    "Appearance": "ظہور",
    "Font Size (%)": "حرف کا سائز (٪)",
    "Theme": "خیالیہ",
    "Default": "پہلے سے طے شدہ",
    "Light": "روشنی",
    "Dark": "گہرا",
    "Locale": "لوکل",
    "Save Config": "تشکیل محفوظ کریں",
    "Tree": "درخت",
    "Choose an example tree": "مثال کے درخت کا انتخاب کریں",
    "Pragmatic Phrases": "عملی جملے",
    "Spell by blocks": "بلاکس کے ذریعے ہجے",
    "Spell by blocks in Frequency": "تعدد میں بلاکس کے ذریعے ہجے",
    "Load Selected": "لوڈ کا انتخاب کیا گیا",
    "Revert": "واپس لوٹنا",
    "Save Tree": "درخت کو بچائیں",
    "Back option for all branches": "تمام شاخوں کے لئے بیک آپشن",
    "Switch key to select items": "اشیاء کو منتخب کرنے کے لئے کلید سوئچ کریں",
    "Move with the other switch (Step scanning)": "دوسرے سوئچ کے ساتھ منتقل کریں (مرحلہ اسکیننگ)",
    "Export": "برآمد کریں",
    "Import": "درآمد کریں",
    "New": "نئی",
    "Delete": "حذف کریں",
    "Helpers": "مددگار",
    "English (UK)": "انگریزی (یوکے)",
    "German": "جرمن",
    "Arabic": "عربی",
    "Spanish": "ہسپانوی",
    "Gujarati": "گجراتی",
    "Grey-Red": "گرے ریڈ",
    "Yellow-Black": "پیلا سیاہ",
    "Black-Yellow": "کالی پیلا",
    "Mint": "ٹکسال",
    "Active Tree": "ایکٹو ٹری",
    "French": "فرانسیسی",
    "Jokes": "لطیفے",
    "Adult Starter": "ایڈلٹ اسٹارٹر",
    "Simple Adult Starter": "سادہ بالغ آغاز",
    "Simple Adult Starter - Chinese Main": "سادہ بالغ آغاز - چینی مین",
    "Welsh": "ویلش",
    "Light-Bold": "ہلکا بولڈ",
    "Spell by Word/Letter Prediction": "لفظ / خط کی پیش گوئی کے ذریعے ہجے کریں",
    "Access": "رسائی",
    "Vocabulary": "ذخیرہ الفاظ",
    "Tools": "اوزار",
    "Edit tree": "درخت میں ترمیم کریں",
    "At beginning": "شروع میں",
    "At end": "آخر میں",
    "None": "کوئی نہیں",
    "Minimum Cue Time(ms)": "کم سے کم کیو ٹائم (ایم ایس)",
    "Scrollwheel": "اسکرول وہیل",
    "1 switch - Auto-Scan": "1 سوئچ - آٹو اسکین",
    "2+ Switches": "2+ سوئچز",
    "Only for auto-scan access mode": "صرف آٹو اسکین رسائی موڈ کیلئے",
    "On": "پر",
    "Select Item": "آئٹم منتخب کریں",
    "Go Back": "واپس جاو",
    "Move to Next": "اگلے میں منتقل کریں",
    "Move to Previous": "پچھلے میں منتقل کریں"
};

})();
