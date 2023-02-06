(function() {

	var dfs = {"am_pm":["AM","PM"],"day_name":["Sonntag, Montag, Dienstag, Mittwoch, Donnerstag, Freitag, Samstag"],"day_short":["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],"era":["BC","AD"],"era_name":["Before Christ","Anno Domini"],"month_name":["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],"month_short":["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],"order_full":"DMY","order_long":"DMY","order_medium":"DMY","order_short":"DMY"};
	var nfs = {"decimal_separator":".","grouping_separator":",","minus":"-"};
	var df = {SHORT_PADDED_CENTURY:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1)+'/'+d.getFullYear());}},SHORT:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1)+'/'+(d.getFullYear()+'').substring(2));}},SHORT_NOYEAR:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'/'+((d.getMonth()+101)+'').substring(1));}},SHORT_NODAY:function(d){if(d){return(((d.getMonth()+101)+'').substring(1)+'/'+(d.getFullYear()+'').substring(2));}},MEDIUM:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'-'+dfs.month_short[d.getMonth()]+'-'+d.getFullYear());}},MEDIUM_NOYEAR:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+'-'+dfs.month_short[d.getMonth()]);}},MEDIUM_WEEKDAY_NOYEAR:function(d){if(d){return(dfs.day_short[d.getDay()]+' '+((d.getDate()+101)+'').substring(1)+'-'+dfs.month_short[d.getMonth()]);}},LONG_NODAY:function(d){if(d){return(dfs.month_name[d.getMonth()]+' '+d.getFullYear());}},LONG:function(d){if(d){return(((d.getDate()+101)+'').substring(1)+' '+dfs.month_name[d.getMonth()]+' '+d.getFullYear());}},FULL:function(d){if(d){return(dfs.day_name[d.getDay()]+','+' '+d.getDate()+' '+dfs.month_name[d.getMonth()]+' '+d.getFullYear());}}};
	
	window.icu = window.icu || new Object();
	var icu = window.icu;	
		
	icu.getCountry = function() { return "DE" };
	icu.getCountryName = function() { return "Deutschland" };
	icu.getDateFormat = function(formatCode) { var retVal = {}; retVal.format = df[formatCode]; return retVal; };
	icu.getDateFormats = function() { return df; };
	icu.getDateFormatSymbols = function() { return dfs; };
	icu.getDecimalFormat = function(places) { var retVal = {}; retVal.format = function(n) { var ns = n < 0 ? Math.abs(n).toFixed(places) : n.toFixed(places); var ns2 = ns.split('.'); s = ns2[0]; var d = ns2[1]; var rgx = /(\d+)(\d{3})/;while(rgx.test(s)){s = s.replace(rgx, '$1' + nfs["grouping_separator"] + '$2');} return (n < 0 ? nfs["minus"] : "") + s + nfs["decimal_separator"] + d;}; return retVal; };
	icu.getDecimalFormatSymbols = function() { return nfs; };
	icu.getIntegerFormat = function() { var retVal = {}; retVal.format = function(i) { var s = i < 0 ? Math.abs(i).toString() : i.toString(); var rgx = /(\d+)(\d{3})/;while(rgx.test(s)){s = s.replace(rgx, '$1' + nfs["grouping_separator"] + '$2');} return i < 0 ? nfs["minus"] + s : s;}; return retVal; };
	icu.getLanguage = function() { return "de" };
	icu.getLanguageName = function() { return "Deutsch" };
	icu.getLocale = function() { return "de" };
	icu.getLocaleName = function() { return "German" };

  icu.rtl = false;
  icu.dictionary = {
    "help_title": "PASCO - Socorro",
    "Toggle navigation": "Alternar de navegação",
    "Start": "Começar",
    "CONTRIBUTORS": "CONTRIBUIDORES",
    "COPYRIGHT": "DIREITO AUTORAL",
    "Copyright info": "Informação de direitos autorais",
    "Techs": "Techs",
    "Web Responsive Voice": "Voz responsiva na web",
    "Configure": "Configurar",
    "Help": "Socorro",
    "Edit Mode": "Modo de edição",
    "Save": "Salve ",
    "Cancel": "Cancelar",
    "Clear Storage": "Armazenagem limpa",
    "Setting": "Configuração",
    "Record Audio": "Gravar audio",
    "record_btn_desc": "record_btn_desc",
    "For": "Para",
    "Both": "Ambos",
    "Main": "a Principal",
    "Cue": "Cue",
    "Record": "Registro",
    "Audio List": "Lista de Áudio",
    "Close": "Fechar",
    "config_title": "config_title",
    "Configuration": "Configuração",
    "Settings": "Definições",
    "On-Screen Navigation": "Navegação na tela",
    "Auto": "Auto",
    "Enable": "Habilitar",
    "Disable": "Desabilitar",
    "Switch Access": "Troca de acesso",
    "Automatic-Scanning": "Verificação automática",
    "Manual": "Manual",
    "Loops": "rotações",
    "Delay at first item (ms)": "Atraso no primeiro item (ms)",
    "Auto-scanning delay (ms)": "Atraso de verificação automática (ms)",
    "Switch Key to move forward": "Chave de mudança para avançar",
    "First Time Run (Cue Voice)": "Primeira execução (voz de sugestão)",
    "Voice": "Voz",
    "Volume": "Volume",
    "Pitch": "Arremesso",
    "Using a keyboard: Hitting 1 will go to previous and 2 to next. Also keys W/S, Up/Down arrow will work to navigate the tree": "Usando um teclado: Pressionar 1 irá para a anterior e 2 para a próxima. Além disso, as teclas W / S, seta para cima / para baixo funcionarão para navegar na árvore",
    "Switch key to move forward": "Alterne a chave para seguir em frente",
    "Ignore second hits(ms)": "Ignorar segundos acessos (ms)",
    "Ignore key presses under n ms": "Ignorar pressionamentos de tecla abaixo de n ms",
    "Speech": "Discurso",
    "Cue Voice": "Voz Cue",
    "Main Voice": "Voz Principal",
    "Appearance": "Aparência",
    "Font Size (%)": "Tamanho da fonte (%)",
    "Theme": "Tema",
    "Default": "Padrão",
    "Light": "Luz",
    "Dark": "Sombrio",
    "Locale": "Localidade",
    "Save Config": "Salvar configuração",
    "Tree": "Árvore",
    "Choose an example tree": "Escolha um exemplo de árvore",
    "Pragmatic Phrases": "Frases Pragmáticas",
    "Spell by blocks": "Soletrar por blocos",
    "Spell by blocks in Frequency": "Soletrar por blocos na frequência",
    "Load Selected": "Carregar Selecionado",
    "Revert": "Reverter",
    "Save Tree": "Salvar árvore",
    "Back option for all branches": "Opção de volta para todos os ramos",
    "Switch key to select items": "Chave de mudança para selecionar itens",
    "Move with the other switch (Step scanning)": "Mova com o outro interruptor (verificação por etapas)",
    "Export": "Exportar",
    "Import": "Importar",
    "New": "Novo",
    "Delete": "Excluir",
    "Helpers": "Ajudantes",
    "English (UK)": "Inglês (Reino Unido)",
    "German": "alemão",
    "Arabic": "árabe",
    "Spanish": "espanhol",
    "Gujarati": "Guzerate",
    "Grey-Red": "Cinza-vermelho",
    "Yellow-Black": "Amarelo-Preto",
    "Black-Yellow": "Preto amarelo",
    "Mint": "hortelã",
    "Active Tree": "Árvore Ativa",
    "French": "francês",
    "Jokes": "Piadas",
    "Adult Starter": "Adulto Starter",
    "Simple Adult Starter": "Adulto simples para iniciantes",
    "Simple Adult Starter - Chinese Main": "Entrada simples para adultos - chinês principal",
    "Welsh": "galês",
    "Light-Bold": "Light-Bold",
    "Spell by Word/Letter Prediction": "Soletrar por previsão de palavras / letras",
    "Access": "Acesso",
    "Vocabulary": "Vocabulário",
    "Tools": "Ferramentas",
    "Edit tree": "Editar árvore",
    "At beginning": "No começo",
    "At end": "No final",
    "None": "Nenhum",
    "Minimum Cue Time(ms)": "Tempo mínimo de sugestão (ms)",
    "Scrollwheel": "Rodinha do mouse",
    "1 switch - Auto-Scan": "1 switch - Auto-Scan",
    "2+ Switches": "2+ interruptores",
    "Only for auto-scan access mode": "Apenas para o modo de acesso de verificação automática",
    "On": "Em",
    "Select Item": "Selecionar item",
    "Go Back": "Volte",
    "Move to Next": "Mover para a próxima",
    "Move to Previous": "Mover para o anterior"
};

  document.dispatchEvent(new CustomEvent('x-icu-changed', { detail: icu }))
})();
