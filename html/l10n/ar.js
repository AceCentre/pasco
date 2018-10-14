(function() {

	var dfs = {"am_pm":["ص","م"],"day_name":["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"],"day_short":["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"],"era":["ق.م","م"],"era_name":["قبل الميلاد","ميلادي"],"month_name":["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],"month_short":["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],"order_full":"DMY","order_long":"DMY","order_medium":"DMY","order_short":"DMY"};
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
	icu.getLanguage = function() { return "ar" };
	icu.getLanguageName = function() { return "العربية" };
	icu.getLocale = function() { return "ar" };
	icu.getLocaleName = function() { return "العربية" };

  icu.rtl = true;
  icu.dictionary = {
    "help_title": "باسكو - مساعدة",
    "Toggle navigation": "تبديل التنقل",
    "Start": "بداية",
    "CONTRIBUTORS": "المساهمون",
    "COPYRIGHT": "حقوق النشر",
    "Copyright info": "معلومات حقوق التأليف والنشر",
    "Techs": "التكنولوجية",
    "Web Responsive Voice": "صوت الويب المستجيب",
    "Configure": "تهيئة",
    "Help": "مساعدة",
    "Edit Mode": "تحرير الوضع",
    "Save": "حفظ",
    "Cancel": "إلغاء",
    "Clear Storage": "تخزين واضح",
    "Setting": "ضبط",
    "Record Audio": "تسجيل صوتي",
    "record_btn_desc": "حدد الهدف للتسجيل وعن طريق الضغط على زر سجل سجل يبدأ. عن طريق الإفراج عنه سيتم إضافة السجل",
    "For": "إلى عن على",
    "Both": "على حد سواء",
    "Main": "الصوت الرئيسي",
    "Cue": "جديلة",
    "Record": "سجل",
    "Audio List": "قائمة الصوت",
    "Close": "قريب",
    "config_title": "باسكو - التكوين",
    "Configuration": "ترتيب",
    "Settings": "إعدادات",
    "On-Screen Navigation": "الملاحة على الشاشة",
    "Auto": "تلقاءي",
    "Enable": "مكن",
    "Disable": "تعطيل",
    "Switch Access": "تبديل الوصول",
    "Automatic-Scanning": "التلقائي المسح الضوئي",
    "Manual": "كتيب",
    "Loops": "الحلقات",
    "Delay at first item (ms)": "التأخير في البند الأول (بالميلي ثانية)",
    "Auto-scanning delay (ms)": "تأخير المسح التلقائي (بالميلي ثانية)",
    "Switch Key to move forward": "مفتاح التبديل للمضي قدما",
    "First Time Run (Cue Voice)": "تشغيل لأول مرة (صوت جديلة)",
    "Voice": "صوت",
    "Volume": "الصوت",
    "Pitch": "ملعب كورة قدم",
    "Using a keyboard: Hitting 1 will go to previous and 2 to next. Also keys W/S, Up/Down arrow will work to navigate the tree": "باستخدام لوحة المفاتيح: سيبدأ الضغط على الرقم 1 و 2 إلى التالي. كما تعمل مفاتيح W / S ، سهم أعلى / أسفل للتنقل الشجرة",
    "Switch key to move forward": "مفتاح التبديل للمضي قدما",
    "Ignore second hits(ms)": "تجاهل النتائج الثانية (بالميلي ثانية)",
    "Ignore key presses under n ms": "تجاهل الضغط على المفاتيح تحت n ms",
    "Speech": "خطاب",
    "Cue Voice": "صوت جديلة",
    "Main Voice": "الصوت الرئيسي",
    "Appearance": "مظهر خارجي",
    "Font Size (%)": "حجم الخط (٪)",
    "Theme": "موضوع",
    "Default": "افتراضي",
    "Light": "ضوء",
    "Dark": "داكن",
    "Locale": "مكان",
    "Save Config": "حفظ التكوين",
    "Tree": "شجرة",
    "Choose an example tree": "اختر شجرة المثال",
    "Pragmatic Phrases": "العبارات البراغماتية",
    "Spell by blocks": "تهجئة كتل",
    "Spell by blocks in Frequency": "تهجئة كتل في التردد",
    "Load Selected": "تحميل مختارة",
    "Revert": "العودة",
    "Save Tree": "حفظ الشجرة",
    "Back option for all branches": "خيار العودة لجميع الفروع",
    "Switch key to select items": "مفتاح التبديل لتحديد العناصر",
    "Move with the other switch (Step scanning)": "تحرك مع مفتاح آخر (المسح الضوئي الخطوة)",
    "Export": "تصدير",
    "Import": "استيراد",
    "New": "الجديد",
    "Delete": "حذف",
    "Helpers": "المساعدون",
    "English (UK)": "الإنجليزية (المملكة المتحدة)",
    "German": "ألمانية",
    "Arabic": "عربى",
    "Spanish": "الأسبانية",
    "Gujarati": "الغوجاراتية",
    "Grey-Red": "رمادي أحمر",
    "Yellow-Black": "أصفر أسود",
    "Black-Yellow": "أصفر مسود",
    "Mint": "نعناع",
    "Active Tree": "شجرة نشطة",
    "French": "الفرنسية"
  };

})();