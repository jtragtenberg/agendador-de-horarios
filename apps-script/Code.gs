/**
 * Backend do Agendador de Horários — Google Apps Script
 *
 * Como usar:
 * 1. Crie uma Planilha Google nova (ou use uma existente).
 * 2. No menu, vá em Extensões > Apps Script.
 * 3. Apague o conteúdo padrão do arquivo Code.gs e cole todo este arquivo.
 * 4. Clique em Implantar > Nova implantação.
 *    - Tipo: App da Web
 *    - Executar como: Eu (seu usuário)
 *    - Quem pode acessar: Qualquer pessoa
 * 5. Copie a URL do app da web gerada e cole em SCRIPT_URL no arquivo script.js.
 */

var SHEET_NAME = 'Respostas';

function doGet(e) {
  var sheet = getSheet_();
  var data = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) {
      rows.push({
        nome: String(data[i][0]),
        dia: Number(data[i][1]),
        hora: Number(data[i][2])
      });
    }
  }
  return respond_({ rows: rows });
}

function doPost(e) {
  var params = (e && e.parameter) || {};

  if (params.action === 'save') {
    var nome = (params.nome || '').trim();
    if (!nome) {
      return respond_({ error: 'Nome é obrigatório.' });
    }

    var slots;
    try {
      slots = JSON.parse(params.slots || '[]');
    } catch (err) {
      return respond_({ error: 'Formato de horários inválido.' });
    }

    var sheet = getSheet_();
    removeRowsForName_(sheet, nome);

    var now = new Date();
    slots.forEach(function (slot) {
      var parts = String(slot).split('-');
      var dia = parseInt(parts[0], 10);
      var hora = parseInt(parts[1], 10);
      if (!isNaN(dia) && !isNaN(hora)) {
        sheet.appendRow([nome, dia, hora, now]);
      }
    });

    return respond_({ success: true });
  }

  if (params.action === 'delete') {
    var nomeToDelete = (params.nome || '').trim();
    if (!nomeToDelete) {
      return respond_({ error: 'Nome é obrigatório.' });
    }
    var sheetDel = getSheet_();
    removeRowsForName_(sheetDel, nomeToDelete);
    return respond_({ success: true });
  }

  return respond_({ error: 'Ação inválida.' });
}

function removeRowsForName_(sheet, nome) {
  var data = sheet.getDataRange().getValues();
  var alvo = nome.toLowerCase();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]).trim().toLowerCase() === alvo) {
      sheet.deleteRow(i + 1);
    }
  }
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Nome', 'Dia', 'Hora', 'Timestamp']);
  }
  return sheet;
}

function respond_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
