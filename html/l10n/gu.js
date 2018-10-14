(function() {

	var dfs = {"am_pm":["AM","PM"],"day_name":["રવિવાર", "સોમવાર", "મંગળવાર", "બુધવાર", "ગુરુવાર", "શુક્રવાર", "શનિવાર"],"day_short":["રવિવાર", "સોમવાર", "મંગળવાર", "બુધવાર", "ગુરુવાર", "શુક્રવાર", "શનિવાર"],"era":["BC","AD"],"era_name":["Before Christ","Anno Domini"],"month_name":["જાન્યુઆરી", "ફેબ્રુઆરી", "માર્ચ", "એપ્રિલ", "મે", "જૂન", "જુલાઈ", "ઑગસ્ટ", "સપ્ટેમ્બર", "ઑક્ટોબર", "નવેમ્બર", "ડિસેમ્બર"],"month_short":["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],"order_full":"DMY","order_long":"DMY","order_medium":"DMY","order_short":"DMY"};
	var nfs = {"decimal_separator":".","grouping_separator":",","minus":"-"};
	var df = {SHORT_PADDED_CENTURY:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1)+'/'+d.getFullYear());}},SHORT:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1)+'/'+(d.getFullYear()+'').substring(2));}},SHORT_NOYEAR:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1));}},SHORT_NODAY:function(d){if(d){return(((d.getMonth()+101)+'').substring(1)+'/'+(d.getFullYear()+'').substring(2));}},MEDIUM:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'-'+dfs.month_short[d.getMonth()]+'-'+d.getFullYear());}},MEDIUM_NOYEAR:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'-'+dfs.month_short[d.getMonth()]);}},MEDIUM_WEEKDAY_NOYEAR:function(d){if(d){return(dfs.day_short[d.getDay()]+' '+((d.getDate()+101)+'').substring(1)+'-'+dfs.month_short[d.getMonth()]);}},LONG_NODAY:function(d){if(d){return(dfs.month_name[d.getMonth()]+' '+d.getFullYear());}},LONG:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+' '+dfs.month_name[d.getMonth()]+' '+d.getFullYear());}},FULL:function(d){if(d){return(dfs.day_name[d.getDay()]+','+' '+d.getDate()+' '+dfs.month_name[d.getMonth()]+' '+d.getFullYear());}}};
	
	window.icu = window.icu || new Object();
	var icu = window.icu;	
		
	icu.getCountry = function() { return "IN" };
	icu.getCountryName = function() { return "India" };
	icu.getDateFormat = function(formatCode) { var retVal = {}; retVal.format = df[formatCode]; return retVal; };
	icu.getDateFormats = function() { return df; };
	icu.getDateFormatSymbols = function() { return dfs; };
	icu.getDecimalFormat = function(places) { var retVal = {}; retVal.format = function(n) { var ns = n < 0 ? Math.abs(n).toFixed(places) : n.toFixed(places); var ns2 = ns.split('.'); s = ns2[0]; var d = ns2[1]; var rgx = /(\d+)(\d{3})/;while(rgx.test(s)){s = s.replace(rgx, '$1' + nfs["grouping_separator"] + '$2');} return (n < 0 ? nfs["minus"] : "") + s + nfs["decimal_separator"] + d;}; return retVal; };
	icu.getDecimalFormatSymbols = function() { return nfs; };
	icu.getIntegerFormat = function() { var retVal = {}; retVal.format = function(i) { var s = i < 0 ? Math.abs(i).toString() : i.toString(); var rgx = /(\d+)(\d{3})/;while(rgx.test(s)){s = s.replace(rgx, '$1' + nfs["grouping_separator"] + '$2');} return i < 0 ? nfs["minus"] + s : s;}; return retVal; };
	icu.getLanguage = function() { return "gu" };
	icu.getLanguageName = function() { return "Gujarati" };
	icu.getLocale = function() { return "gu" };
	icu.getLocaleName = function() { return "Gujarati" };

  icu.rtl = false;
  icu.dictionary = {
    "help_title": "પાસ્કો - સહાય",
    "Toggle navigation": "નેવિગેશન ટૉગલ કરો",
    "Start": "શરૂઆત",
    "CONTRIBUTORS": "ફાળો આપનારા",
    "COPYRIGHT": "કૉપિરાઇટ",
    "Copyright info": "કૉપિરાઇટ માહિતી",
    "Techs": "ટેક્સ",
    "Web Responsive Voice": "વેબ રિસ્પોન્સિવ વૉઇસ",
    "Configure": "રૂપરેખાંકિત કરો",
    "Help": "મદદ",
    "Edit Mode": "ફેરફાર કરો મોડ",
    "Save": "સાચવો",
    "Cancel": "રદ કરો",
    "Clear Storage": "સાફ સંગ્રહ",
    "Setting": "સેટિંગ",
    "Record Audio": "રેકોર્ડ ઑડિઓ",
    "record_btn_desc": "રેકોર્ડિંગ માટે લક્ષ્ય પસંદ કરો અને રેકોર્ડ બટન રેકોર્ડ દ્વારા પ્રારંભ થાય છે. તેને રીલીઝ કરીને રેકોર્ડ ઉમેરવામાં આવશે",
    "For": "માટે",
    "Both": "બન્ને",
    "Main": "મુખ્ય અવાજ",
    "Cue": "ક્યુ",
    "Record": "રેકોર્ડ",
    "Audio List": "ઑડિઓ સૂચિ",
    "Close": "બંધ",
    "config_title": "પાસ્કો - રૂપરેખા",
    "Configuration": "રૂપરેખાંકન",
    "Settings": "સેટિંગ્સ",
    "On-Screen Navigation": "ઑન-સ્ક્રીન નેવિગેશન",
    "Auto": "ઑટો",
    "Enable": "સક્ષમ કરો",
    "Disable": "અક્ષમ કરો",
    "Switch Access": "સ્વીચ ઍક્સેસ",
    "Automatic-Scanning": "સ્વચાલિત સ્કેનિંગ",
    "Manual": "મેન્યુઅલ",
    "Loops": "લૂપ્સ",
    "Delay at first item (ms)": "પ્રથમ આઇટમ (એમએસ) પર વિલંબ",
    "Auto-scanning delay (ms)": "ઑટો-સ્કેનિંગ વિલંબ (એમએસ)",
    "Switch Key to move forward": "આગળ વધવા માટે કી સ્વિચ કરો",
    "First Time Run (Cue Voice)": "ફર્સ્ટ ટાઇમ રન (ક્યુ વૉઇસ)",
    "Voice": "અવાજ",
    "Volume": "વોલ્યુમ",
    "Pitch": "પીચ",
    "Using a keyboard: Hitting 1 will go to previous and 2 to next. Also keys W/S, Up/Down arrow will work to navigate the tree": "કીબોર્ડનો ઉપયોગ કરીને: 1 હિટિંગ પહેલાની અને 2 ને આગળ જશે. પણ ડબલ્યુ / એસ, ઉપ / ડાઉન એરો વૃક્ષને નેવિગેટ કરવા માટે કાર્ય કરશે",
    "Switch key to move forward": "આગળ વધવા માટે કી સ્વિચ કરો",
    "Ignore second hits(ms)": "બીજી હિટ અવગણો (એમએસ)",
    "Ignore key presses under n ms": "એન એમએસ હેઠળ કી દબાવો અવગણો",
    "Speech": "ભાષણ",
    "Cue Voice": "ક્યુ વૉઇસ",
    "Main Voice": "મુખ્ય અવાજ",
    "Appearance": "દેખાવ",
    "Font Size (%)": "અક્ષર ની જાડાઈ (%)",
    "Theme": "થીમ",
    "Default": "ડિફોલ્ટ",
    "Light": "પ્રકાશ",
    "Dark": "ડાર્ક",
    "Locale": "લોકેલ",
    "Save Config": "સાચવો રૂપરેખા",
    "Tree": "વૃક્ષ",
    "Choose an example tree": "ઉદાહરણ વૃક્ષ પસંદ કરો",
    "Pragmatic Phrases": "વ્યવહારિક શબ્દસમૂહો",
    "Spell by blocks": "બ્લોક્સ દ્વારા જોડણી",
    "Spell by blocks in Frequency": "ફ્રીક્વન્સીમાં બ્લોક્સ દ્વારા જોડણી કરો",
    "Load Selected": "પસંદ કરેલ લોડ",
    "Revert": "પાછા ફરો",
    "Save Tree": "વૃક્ષ સાચવો",
    "Back option for all branches": "બધા શાખાઓ માટે પાછા વિકલ્પ",
    "Switch key to select items": "વસ્તુઓ પસંદ કરવા માટે કી સ્વિચ કરો",
    "Move with the other switch (Step scanning)": "બીજા સ્વીચ (પગલા સ્કેનિંગ) સાથે ખસેડો",
    "Export": "નિકાસ",
    "Import": "આયાત કરો",
    "New": "નવું",
    "Delete": "કાઢી નાખો",
    "Helpers": "સહાયક",
    "English (UK)": "અંગ્રેજી (યુકે)",
    "German": "જર્મન",
    "Arabic": "અરબી",
    "Spanish": "સ્પેનિશ",
    "Gujarati": "ગુજરાતી",
    "Grey-Red": "ગ્રે-રેડ",
    "Yellow-Black": "યલો-બ્લેક",
    "Black-Yellow": "બ્લેક-યલો",
    "Mint": "મિન્ટ",
    "Active Tree": "સક્રિય વૃક્ષ",
    "French": "ફ્રેન્ચ"
   };
  
})();
