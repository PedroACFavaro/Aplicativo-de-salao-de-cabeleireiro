# Salão Ideal — Sistema de Agendamentos

Sistema completo de gestão para salão de beleza, substituindo o AppSheet.  
Tecnologias: HTML/CSS/JS puro + Google Sheets + Google Apps Script + Login Google.

---

## Estrutura do projeto

```
SalãoIdeal/
├── index.html              ← Aplicação SPA completa
├── css/
│   └── style.css           ← Todos os estilos
├── js/
│   └── app.js              ← Toda a lógica (2 constantes a configurar)
├── apps-script/
│   └── Code.gs             ← Backend Google Apps Script (1 constante a configurar)
└── README.md
```

---

## PASSO 1 — Criar a Planilha Google Sheets

1. Acesse [sheets.google.com](https://sheets.google.com) e crie uma nova planilha.
2. Nomeie como **"Salão Ideal"** (ou qualquer nome).
3. Copie o **ID da planilha** da URL:
   ```
   https://docs.google.com/spreadsheets/d/  ESTE_É_O_ID  /edit
   ```

As abas serão criadas automaticamente na próxima etapa.

---

## PASSO 2 — Publicar o Google Apps Script

### 2.1 — Abrir o editor

1. Na planilha, clique em **Extensões → Apps Script**.
2. Isso abre o editor do Apps Script.

### 2.2 — Colar o código

1. Apague o código padrão (`function myFunction() {}`).
2. Cole **todo o conteúdo** do arquivo `apps-script/Code.gs`.
3. Na linha 6, substitua:
   ```javascript
   const SPREADSHEET_ID = 'SEU_SPREADSHEET_ID_AQUI';
   ```
   pelo ID que você copiou no Passo 1.

### 2.3 — Criar as abas da planilha

1. No editor do Apps Script, selecione a função `setupSpreadsheet` no menu dropdown.
2. Clique em **▶ Executar**.
3. Autorize as permissões quando solicitado.
4. As 4 abas (`Agendamentos`, `Clientes`, `Servicos`, `Funcionarios`) serão criadas automaticamente com os cabeçalhos corretos.

### 2.4 — Adicionar o primeiro Admin

Na aba **Funcionarios** da planilha, adicione manualmente a primeira linha de dados:

| FuncionarioID | Nome       | Telefone      | Email                  | Role  |
|---------------|------------|---------------|------------------------|-------|
| FUNC001       | Seu Nome   | 41999999999   | seuemail@gmail.com     | Admin |

> **Importante:** O email deve ser exatamente o mesmo da conta Google que vai fazer login.

### 2.5 — Publicar como Web App

1. No editor do Apps Script, clique em **Implantar → Nova implantação**.
2. Clique no ícone de engrenagem e selecione **"App da Web"**.
3. Configure:
   - **Descrição:** Salão Ideal API
   - **Executar como:** Eu (sua conta Google)
   - **Quem tem acesso:** Qualquer pessoa (anônimo)
4. Clique em **Implantar**.
5. Autorize o acesso quando solicitado.
6. Copie a **URL do Web App** — ela tem o formato:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

---

## PASSO 3 — Configurar o Login Google OAuth

### 3.1 — Criar projeto no Google Cloud

1. Acesse [console.cloud.google.com](https://console.cloud.google.com).
2. Crie um novo projeto (ex: "Salão Ideal").
3. No menu lateral, vá em **APIs e Serviços → Tela de consentimento OAuth**.
4. Selecione **Externo** e preencha:
   - Nome do app: Salão Ideal
   - Email de suporte: seu email
5. Em **Escopos**, não precisa adicionar nada extra.
6. Em **Usuários de teste**, adicione seu email (enquanto não publicar o app).

### 3.2 — Criar credenciais OAuth

1. Vá em **APIs e Serviços → Credenciais**.
2. Clique em **+ Criar credenciais → ID do cliente OAuth**.
3. Tipo: **Aplicativo da Web**.
4. Nome: Salão Ideal Frontend.
5. Em **Origens JavaScript autorizadas**, adicione:
   - `http://localhost` (para testes locais)
   - `https://SEU-USUARIO.github.io` (seu GitHub Pages)
6. Clique em **Criar**.
7. Copie o **ID do cliente** — formato: `xxxxxxxxx.apps.googleusercontent.com`.

---

## PASSO 4 — Configurar o Frontend

Abra o arquivo `js/app.js` e edite as duas linhas no topo:

```javascript
const CONFIG = {
  SALON_NAME:   'Nome do Seu Salão',          // ← Troque aqui
  WEBAPP_URL:   'https://script.google.com/macros/s/SEU_SCRIPT_ID/exec',  // ← Cole a URL do Passo 2.5
  GOOGLE_CLIENT_ID: 'SEU_CLIENT_ID.apps.googleusercontent.com',           // ← Cole o ID do Passo 3.2
  // ... resto não precisa mexer
};
```

---

## PASSO 5 — Publicar no GitHub Pages

### 5.1 — Criar repositório

1. Acesse [github.com](https://github.com) e crie um novo repositório público.
2. Nome sugerido: `salao-ideal` (ou qualquer nome).

### 5.2 — Fazer upload dos arquivos

**Opção A — Interface web do GitHub:**
1. No repositório, clique em **Add file → Upload files**.
2. Faça upload de toda a pasta (index.html, css/, js/).
3. **Não envie** a pasta `apps-script/` (é só para referência local).

**Opção B — Git via terminal:**
```bash
cd D:/SalãoIdeal
git init
git add index.html css/ js/
git commit -m "Primeira versão"
git remote add origin https://github.com/SEU-USUARIO/salao-ideal.git
git push -u origin main
```

### 5.3 — Ativar o GitHub Pages

1. No repositório, vá em **Settings → Pages**.
2. Em **Source**, selecione **Deploy from a branch**.
3. Branch: **main**, pasta: **/ (root)**.
4. Clique em **Save**.
5. Aguarde 1-2 minutos. Seu site estará em:
   ```
   https://SEU-USUARIO.github.io/salao-ideal/
   ```

### 5.4 — Atualizar o Google Cloud com a URL final

1. Volte em **Google Cloud → Credenciais → seu ID OAuth**.
2. Adicione a URL do GitHub Pages em **Origens JavaScript autorizadas**:
   ```
   https://SEU-USUARIO.github.io
   ```
3. Salve.

---

## PASSO 6 — Teste Final

1. Acesse `https://SEU-USUARIO.github.io/salao-ideal/`
2. Clique em **Entrar com Google**
3. Faça login com o email que cadastrou na planilha (Passo 2.4)
4. O sistema deve carregar a agenda!

Se aparecer erro **"Usuário não autorizado"**, verifique se o email na planilha está idêntico ao da sua conta Google.

---

## Fluxo de uso

### Para o Admin

| Ação | Como fazer |
|------|-----------|
| Ver agenda do dia | Tela inicial — use ‹ e › para navegar |
| Criar agendamento | Botão "+ Agendar" no canto superior direito |
| Editar agendamento | Clique no bloco colorido na agenda → editar campos no popup inline → Salvar |
| Excluir agendamento | Clique no bloco colorido na agenda → ícone 🗑️ no popup → confirmar |
| Ver agendamentos sobrepostos | Passe o mouse sobre qualquer bloco que esteja empilhado — eles se abrem em diagonal |
| Gerenciar clientes | Menu lateral → Clientes |
| Gerenciar serviços | Menu lateral → Serviços |
| Cadastrar funcionária | Menu lateral → Funcionários |
| Enviar WhatsApp | Clique no agendamento → ícone 📱 no popup |
| Atualizar manual | Botão ↻ no header (auto atualiza a cada 3 min) |
| Reorganizar colunas | Arrastar o cabeçalho de uma funcionária para outra posição |
| Ver próximos agendamentos | Menu → Agendamentos → botões de página ‹ 1 2 3 › no rodapé da tabela |

### Para Funcionárias (Role = Funcionario)

- Veem apenas o menu **Agenda**
- Visualizam somente os **próprios agendamentos** no calendário
- Clique em um agendamento exibe os detalhes (somente leitura — sem edição)
- Não podem criar, editar ou excluir nada

### Comportamento visual da agenda

| Recurso | Descrição |
|---------|-----------|
| Grade em 30 min | Linhas e labels a cada 30 minutos (08:00, 08:30, 09:00…) |
| Empilhamento | Agendamentos que começam mais tarde ficam visualmente por cima dos que se prolongam |
| Fan-out no hover | Blocos sobrepostos se abrem em diagonal (~20°) ao passar o mouse, revelando todos |
| Popup de edição | Clique abre um popup inline com todos os campos editáveis — sem abrir tela separada |

---

## Estrutura da Planilha

### Aba: Agendamentos
| AgendamentoID | Data | Horario | ClienteID | ServicoID | Status | Observacoes | FuncionarioID |
|---|---|---|---|---|---|---|---|
| AGXXXXXXX | 2026-06-02 | 14:00 | CLXXXXXX | SVXXXXXX | Confirmado | ... | FNXXXXXX |

### Aba: Clientes
| ClienteID | Nome | Telefone | Email | Observacoes |
|---|---|---|---|---|
| CLXXXXXX | Maria Silva | 41999999999 | maria@email.com | ... |

### Aba: Servicos
| ServicoID | Nome | Duracao_min | Preco |
|---|---|---|---|
| SVXXXXXX | Corte feminino | 60 | 80 |

### Aba: Funcionarios
| FuncionarioID | Nome | Telefone | Email | Role |
|---|---|---|---|---|
| FNXXXXXX | Ana Paula | 41988888888 | ana@gmail.com | Admin |

---

## Atualização de versão do Apps Script

Quando editar o `Code.gs` no futuro:
1. Abra o Apps Script.
2. Faça as alterações.
3. Clique em **Implantar → Gerenciar implantações**.
4. Clique no lápis ✏️ na implantação existente.
5. Selecione **Nova versão** e clique em **Implantar**.

> Se criar uma nova implantação (em vez de atualizar a existente), a URL muda e você precisa atualizar `WEBAPP_URL` no `app.js`.

---

## Solução de problemas

| Problema | Solução |
|----------|---------|
| "Usuário não autorizado" | Verifique o email na aba Funcionarios |
| Erro 401 / token inválido | Verifique o `GOOGLE_CLIENT_ID` em `app.js` |
| Agenda não carrega | Verifique a `WEBAPP_URL` em `app.js` |
| Botão Google não aparece | Verifique se o domínio está nas origens autorizadas no Google Cloud |
| Dados não salvam | Verifique se o `SPREADSHEET_ID` em `Code.gs` está correto |
| "Ação inválida" | Reimplante o Apps Script (nova versão) |

---

## Tecnologias utilizadas

- **Frontend:** HTML5 + CSS3 + JavaScript ES2022 (sem frameworks)
- **Tipografia:** Google Fonts — Poppins
- **Backend:** Google Apps Script
- **Banco de dados:** Google Sheets
- **Autenticação:** Google Identity Services (OAuth 2.0)
- **Hospedagem:** GitHub Pages (gratuito) ou Netlify/Vercel (repositório privado, também gratuito)

---

*Desenvolvido para substituir o AppSheet com custo zero de infraestrutura.*
