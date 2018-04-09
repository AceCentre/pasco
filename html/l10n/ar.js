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
    'help_title': 'PASCO - مساعدة',
    'Toggle navigation': 'تبديل التنقل',
    'Start': 'بداية',
    'CONTRIBUTORS': 'المساهمون',
    'COPYRIGHT': 'حقوق النشر',
    'Copyright info': 'معلومات حقوق النشر',
    'Techs': 'فني',
    'Web Responsive Voice': 'صوت الويب المستجيب',
    'Configure': 'التكوين',
    'Help': 'مساعدة',
    'Edit Mode': 'تحرير الوضع',
    'Save': 'حفظ',
    'Cancel': 'إلغاء',
    'Clear Storage': 'تخزين واضح',
    'Setting': 'ضبط',
    'Record Audio': 'تسجيل صوتي',
    'record_btn_desc': 'حدد الهدف للتسجيل وعن طريق الضغط على زر سجل التسجيل. عن طريق الإفراج عنه سيتم إضافة السجل.',
    'For': 'إلى عن على',
    'Both': 'على حد سواء',
    'Main': 'أصلي',
    'Cue': 'جديلة',
    'Record': 'سجل',
    'Audio List': 'قائمة الصوت',
    'Close': 'خروج',
    'config_title': 'PASCO - التكوين',
    'Configuration': 'تكوينات',
    'On-Screen Navigation': 'الملاحة على الشاشة',
    'Auto': 'أوتوماتيكي',
    'Enable': 'مكن',
    'Disable': 'تعطيل',
    'Switch Access': 'تبديل الوصول',
    'Automatic-Scanning': 'التلقائي المسح الضوئي',
    'Manual': 'كتيب',
    'Loops': 'الحلقات',
    'Delay at first item (ms)': 'التأخير في البند الأول (بالميلي ثانية)',
    'Auto-scanning delay (ms)': 'تأخير المسح التلقائي (بالميلي ثانية)',
    'Switch Key to move forward': 'مفتاح التبديل للمضي قدما',
    'First Time Run (Cue Voice)': 'تشغيل لأول مرة (صوت جديلة)',
    'Voice': 'صوت',
    'Volume': 'مقدار',
    'Pitch': 'رمية',
    'Hitting 1 will go to previous and 2 to next. Also W/S, Up/Down arrow will work.': 'ضرب 1 سيذهب إلى السابق و 2 إلى التالي. أيضا W / S ، ستعمل أعلى / أسفل السهم.',
    'Switch key to move forward': 'مفتاح التبديل للمضي قدما',
    'Ignore second hits(ms)': 'تجاهل النتائج الثانية (بالميلي ثانية)',
    'Ignore key presses under n ms': 'تجاهل الضغوط الرئيسية تحت n ms',
    'Speech': 'خطاب',
    'Cue Voice': 'صوت جديلة',
    'Main Voice': 'الصوت الرئيسي',
    'Appearance': 'مظهر خارجي',
    'Font Size (%)': 'حجم الخط (٪)',
    'Theme': 'موضوع',
    'Default': 'افتراضي',
    'Light': 'ضوء',
    'Dark': 'داكن',
    'Locale': 'مكان',
    'Save Config': 'حفظ التكوين',
    'Tree': 'شجرة',
    'Choose a default tree': 'اختر محتوى افتراضي',
    'Pragmatic Phrases': 'العبارات البراغماتية',
    'Spell by blocks': 'تهجئة كتل',
    'Spell by blocks in Frequency': 'تهجئة كتل في التردد',
    'Load Default': 'حمل الإفتراضي',
    'Revert': 'العودة',
    'Save Tree': 'حفظ الشجرة'
  };

})();
