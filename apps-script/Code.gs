// ============================================================
// SALÃO IDEAL - Google Apps Script Backend
// Configurar SPREADSHEET_ID com o ID da sua planilha Google Sheets
// ============================================================

const SPREADSHEET_ID = '1Ut-Kx9RbiTCqJoWO3xwBA5hARehSAHvDEnwgy5Dotpc';

// ============================================================
// ENTRY POINTS
// ============================================================

function doGet(e) {
  const params = e.parameter || {};
  return handleAction(params);
}

function doPost(e) {
  const params = e.parameter || {};
  return handleAction(params);
}

function handleAction(params) {
  try {
    const action = params.action;
    let result;

    switch (action) {
      // Auth
      case 'validateUser':
        result = validateUser(params.token);
        break;

      // Agendamentos
      case 'getAgendamentos':
        result = getAgendamentos(params.data, params.funcionarioId, params.role, params.startDate, params.endDate);
        break;
      case 'createAgendamento':
        result = createAgendamento(params);
        break;
      case 'updateAgendamento':
        result = updateRecord('Agendamentos', params, 'AgendamentoID');
        break;
      case 'deleteAgendamento':
        result = deleteRecord('Agendamentos', params.id, 'AgendamentoID');
        break;

      // Clientes
      case 'getClientes':
        result = getSimpleList('Clientes');
        break;
      case 'createCliente':
        result = createRecord('Clientes', params, ['ClienteID', 'Nome', 'Telefone', 'Email', 'Observacoes']);
        break;
      case 'updateCliente':
        result = updateRecord('Clientes', params, 'ClienteID');
        break;
      case 'deleteCliente':
        result = deleteRecord('Clientes', params.id, 'ClienteID');
        break;

      // Servicos
      case 'getServicos':
        result = getSimpleList('Servicos');
        break;
      case 'createServico':
        result = createRecord('Servicos', params, ['ServicoID', 'Nome', 'Duracao_min', 'Preco']);
        break;
      case 'updateServico':
        result = updateRecord('Servicos', params, 'ServicoID');
        break;
      case 'deleteServico':
        result = deleteRecord('Servicos', params.id, 'ServicoID');
        break;

      // Funcionarios
      case 'getFuncionarios':
        result = getSimpleList('Funcionarios');
        break;
      case 'createFuncionario':
        result = createRecord('Funcionarios', params, ['FuncionarioID', 'Nome', 'Telefone', 'Email', 'Role']);
        break;
      case 'updateFuncionario':
        result = updateRecord('Funcionarios', params, 'FuncionarioID');
        break;
      case 'deleteFuncionario':
        result = deleteRecord('Funcionarios', params.id, 'FuncionarioID');
        break;

      default:
        result = { success: false, error: 'Ação inválida: ' + action };
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// AUTENTICAÇÃO
// ============================================================

function validateUser(token) {
  if (!token) {
    return { success: false, error: 'Token não fornecido' };
  }

  // Verificar o token Google ID via tokeninfo
  let email, name, picture;
  try {
    const response = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + token,
      { muteHttpExceptions: true }
    );
    const tokenData = JSON.parse(response.getContentText());

    if (tokenData.error || !tokenData.email) {
      return { success: false, error: 'Token inválido ou expirado. Faça login novamente.' };
    }
    if (tokenData.email_verified !== 'true' && tokenData.email_verified !== true) {
      return { success: false, error: 'Email não verificado pelo Google.' };
    }

    email = tokenData.email;
    name = tokenData.name || email;
    picture = tokenData.picture || '';
  } catch (err) {
    return { success: false, error: 'Erro ao verificar token: ' + err.toString() };
  }

  // Verificar se o email existe em Funcionarios
  const sheet = getSheet('Funcionarios');
  const funcionarios = sheetToObjects(sheet);
  const user = funcionarios.find(
    f => f.Email && f.Email.trim().toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    return {
      success: false,
      error: 'Usuário não autorizado. O email ' + email + ' não está cadastrado no sistema.',
      email: email
    };
  }

  return {
    success: true,
    user: {
      FuncionarioID: user.FuncionarioID,
      Nome: user.Nome,
      Email: user.Email,
      Telefone: user.Telefone,
      Role: user.Role,
      picture: picture
    }
  };
}

// ============================================================
// AGENDAMENTOS (com dados enriquecidos)
// ============================================================

function getAgendamentos(data, funcionarioId, role, startDate, endDate) {
  // Agendamentos sempre frescos; lookup tables cacheadas por 5 min
  var agendamentos = sheetToObjects(getSheet('Agendamentos'));
  var clientes     = getCachedSheet('Clientes',     300);
  var servicos     = getCachedSheet('Servicos',     300);
  var funcionarios = getCachedSheet('Funcionarios', 300);

  // Mapas de lookup
  const clienteMap = {};
  clientes.forEach(c => { clienteMap[c.ClienteID] = c; });

  const servicoMap = {};
  servicos.forEach(s => { servicoMap[s.ServicoID] = s; });

  const funcionarioMap = {};
  funcionarios.forEach(f => { funcionarioMap[f.FuncionarioID] = f; });

  // Filtrar por data exata ou por intervalo (startDate/endDate)
  let filtered = agendamentos;
  if (data) {
    filtered = filtered.filter(a => a.Data === data);
  } else if (startDate || endDate) {
    filtered = filtered.filter(a => {
      if (!a.Data) return false;
      if (startDate && a.Data < startDate) return false;
      if (endDate   && a.Data > endDate)   return false;
      return true;
    });
  }

  // Funcionário só vê os próprios agendamentos
  if (role === 'Funcionario' && funcionarioId) {
    filtered = filtered.filter(a => a.FuncionarioID === funcionarioId);
  }

  // Enriquecer com dados relacionados
  const enriched = filtered.map(a => {
    const cliente = clienteMap[a.ClienteID] || {};
    const servico = servicoMap[a.ServicoID] || {};
    const funcionario = funcionarioMap[a.FuncionarioID] || {};

    return {
      AgendamentoID: a.AgendamentoID,
      Data: a.Data,
      Horario: a.Horario,
      ClienteID: a.ClienteID,
      ClienteNome: cliente.Nome || 'N/A',
      ClienteTelefone: cliente.Telefone || '',
      ServicoID: a.ServicoID,
      ServicoNome: servico.Nome || 'N/A',
      ServicoDuracao: servico.Duracao_min ? parseInt(servico.Duracao_min) : 60,
      ServicoPreco: servico.Preco ? parseFloat(servico.Preco) : 0,
      FuncionarioID: a.FuncionarioID,
      FuncionarioNome: funcionario.Nome || 'N/A',
      Status: a.Status || 'Pendente',
      Observacoes: a.Observacoes || ''
    };
  });

  // Retornar também a lista de funcionários para colunas do calendário
  return {
    success: true,
    data: enriched,
    funcionarios: funcionarios
  };
}

function createAgendamento(params) {
  const id = generateId('AG');
  const fields = ['AgendamentoID', 'Data', 'Horario', 'ClienteID', 'ServicoID', 'Status', 'Observacoes', 'FuncionarioID'];
  params.AgendamentoID = id;
  return createRecord('Agendamentos', params, fields);
}

// ============================================================
// CRUD GENÉRICO
// ============================================================

function getSimpleList(sheetName) {
  const data = sheetToObjects(getSheet(sheetName));
  return { success: true, data: data };
}

function createRecord(sheetName, params, fields) {
  var sheet   = getSheet(sheetName);
  var idField = fields[0];

  if (!params[idField]) {
    params[idField] = generateId(sheetName.substring(0, 2).toUpperCase());
  }

  var row = fields.map(function(f) { return params[f] !== undefined ? params[f] : ''; });
  sheet.appendRow(row);
  invalidateSheetCache(sheetName);

  return { success: true, id: params[idField] };
}

function updateRecord(sheetName, params, idField) {
  var sheet      = getSheet(sheetName);
  var data       = sheet.getDataRange().getValues();
  var headers    = data[0];
  var idColIndex = headers.indexOf(idField);

  if (idColIndex === -1) {
    return { success: false, error: 'Campo ID não encontrado: ' + idField };
  }

  var targetId = params[idField] || params.id;
  if (!targetId) {
    return { success: false, error: 'ID não fornecido para atualização' };
  }

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === String(targetId)) {
      headers.forEach(function(header, colIndex) {
        if (header !== idField && params[header] !== undefined) {
          sheet.getRange(i + 1, colIndex + 1).setValue(params[header]);
        }
      });
      invalidateSheetCache(sheetName);
      return { success: true };
    }
  }

  return { success: false, error: 'Registro não encontrado com ID: ' + targetId };
}

function deleteRecord(sheetName, id, idField) {
  if (!id) return { success: false, error: 'ID não fornecido' };

  var sheet      = getSheet(sheetName);
  var data       = sheet.getDataRange().getValues();
  var headers    = data[0];
  var idColIndex = headers.indexOf(idField);

  if (idColIndex === -1) {
    return { success: false, error: 'Campo ID não encontrado' };
  }

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idColIndex]) === String(id)) {
      sheet.deleteRow(i + 1);
      invalidateSheetCache(sheetName);
      return { success: true };
    }
  }

  return { success: false, error: 'Registro não encontrado' };
}

// ============================================================
// CACHE DE LOOKUP TABLES (Clientes, Servicos, Funcionarios)
// Essas abas mudam raramente — cachear por 5 min elimina 3 das 4 leituras
// de planilha em cada chamada de getAgendamentos.
// ============================================================

function getCachedSheet(sheetName, ttl) {
  var cache = CacheService.getScriptCache();
  var key   = 'sheet_' + sheetName;
  var hit   = cache.get(key);
  if (hit) {
    try { return JSON.parse(hit); } catch(e) {}
  }
  var data = sheetToObjects(getSheet(sheetName));
  try { cache.put(key, JSON.stringify(data), ttl || 300); } catch(e) {}
  return data;
}

function invalidateSheetCache(sheetName) {
  try { CacheService.getScriptCache().remove('sheet_' + sheetName); } catch(e) {}
}

// ============================================================
// HELPERS
// ============================================================

function getSheet(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const normalize = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const normalName = normalize(name);

  // Coletar todas as abas que batem (exato ou sem acento)
  const matches = ss.getSheets().filter(s =>
    s.getName() === name || normalize(s.getName()) === normalName
  );

  if (matches.length === 0) {
    const available = ss.getSheets().map(s => '"' + s.getName() + '"').join(', ');
    throw new Error('Aba "' + name + '" nao encontrada. Abas disponiveis: ' + available);
  }

  // Se houver duplicatas (ex: "Servicos" vazia + "Serviços" com dados),
  // preferir sempre a que tiver mais linhas de dados
  matches.sort((a, b) => b.getLastRow() - a.getLastRow());
  return matches[0];
}

function sheetToObjects(sheet) {
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const data = range.getValues();
  if (data.length < 2) return [];

  const headers = data[0];
  const rows = data.slice(1);
  const tz = Session.getScriptTimeZone();

  return rows
    .filter(row => row[0] !== '' && row[0] !== null && row[0] !== undefined)
    .map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        let val = row[i];
        if (val instanceof Date) {
          // Valores de hora ficam ancorados em 1899 no Google Sheets.
          // Usar tz (fuso do script = fuso da planilha) para retornar hora correta.
          if (val.getUTCFullYear() <= 1900) {
            val = Utilities.formatDate(val, tz, 'HH:mm');
          } else {
            val = Utilities.formatDate(val, tz, 'yyyy-MM-dd');
          }
        }
        obj[header] = (val !== undefined && val !== null) ? String(val) : '';
      });
      return obj;
    });
}

function generateId(prefix) {
  prefix = prefix || 'ID';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substr(2, 4).toUpperCase();
  return prefix + ts + rand;
}

// ============================================================
// FUNÇÃO PARA CRIAR A PLANILHA COM CABEÇALHOS (executar manualmente 1x)
// ============================================================

function setupSpreadsheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const sheets = {
    'Agendamentos': ['AgendamentoID', 'Data', 'Horario', 'ClienteID', 'ServicoID', 'Status', 'Observacoes', 'FuncionarioID'],
    'Clientes':     ['ClienteID', 'Nome', 'Telefone', 'Email', 'Observacoes'],
    'Servicos':     ['ServicoID', 'Nome', 'Duracao_min', 'Preco'],
    'Funcionarios': ['FuncionarioID', 'Nome', 'Telefone', 'Email', 'Role']
  };

  Object.entries(sheets).forEach(([name, headers]) => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
    Logger.log('Aba configurada: ' + name);
  });

  Logger.log('Planilha configurada com sucesso!');
}
