# Sistema de Agendamentos para Salão de Cabeleireiro

Sistema web completo de gestão de agendamentos para salões de beleza — **gratuito, sem servidores e sem mensalidades**. Roda direto no navegador via GitHub Pages, usa Google Sheets como banco de dados e Google Apps Script como backend.

> Desenvolvido como alternativa ao AppSheet, com custo zero de infraestrutura.

---

## Como funciona

```
Navegador (GitHub Pages)
       │
       │  requisições HTTP
       ▼
Google Apps Script  ←→  Google Sheets (banco de dados)
       │
       │  OAuth 2.0
       ▼
Google Identity (login com conta Gmail)
```

- O **frontend** é um arquivo HTML/CSS/JS estático hospedado gratuitamente no GitHub Pages.
- O **backend** é um Google Apps Script publicado como Web App — age como uma API REST simples que lê e escreve na planilha.
- O **banco de dados** é uma planilha Google Sheets com 4 abas: `Agendamentos`, `Clientes`, `Servicos`, `Funcionarios`.
- O **login** usa Google OAuth 2.0 — o acesso é controlado pelo e-mail cadastrado na aba `Funcionarios`.

Não há servidor Node, Python ou banco de dados para configurar. Tudo roda na infraestrutura do Google.

---

## Funcionalidades

- Agenda visual com grade horária (visão dia e mês), blocos coloridos por funcionária
- Agendamentos sobrepostos com fan-out no hover
- Criar, editar e excluir agendamentos via popup inline
- Envio de mensagens de confirmação, lembrete e cancelamento pelo WhatsApp Web
- Cadastro de clientes, serviços (com duração e preço) e funcionários
- Dois perfis: **Admin** (acesso total) e **Funcionário** (vê só a própria agenda, somente leitura)
- Atualização automática a cada 3 minutos
- Reorganização de colunas por drag-and-drop

---

## Estrutura do projeto

```
/
├── index.html              ← Aplicação SPA completa
├── css/
│   └── style.css           ← Todos os estilos
├── js/
│   └── app.js              ← Toda a lógica da aplicação
├── apps-script/
│   └── Code.gs             ← Backend (cola no Google Apps Script)
└── README.md
```

---

## Configuração — do zero ao ar

### Passo 1 — Criar a planilha

1. Acesse [sheets.google.com](https://sheets.google.com) e crie uma nova planilha em branco.
2. Copie o **ID** da URL:
   ```
   https://docs.google.com/spreadsheets/d/  →ESTE_TRECHO←  /edit
   ```

### Passo 2 — Configurar o Apps Script

1. Na planilha, clique em **Extensões → Apps Script**.
2. Apague o código padrão e cole todo o conteúdo de `apps-script/Code.gs`.
3. Na **linha 6**, substitua o ID:
   ```javascript
   const SPREADSHEET_ID = 'COLE_SEU_ID_AQUI';
   ```
4. No menu dropdown de funções, selecione `setupSpreadsheet` e clique em **▶ Executar** para criar as 4 abas automaticamente.
5. Clique em **Implantar → Nova implantação** → tipo **"App da Web"**:
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
6. Copie a URL gerada (formato `https://script.google.com/macros/s/.../exec`).

### Passo 3 — Adicionar o primeiro Admin

Na aba **Funcionarios** da planilha, insira manualmente a primeira linha:

| FuncionarioID | Nome     | Telefone    | Email              | Role  |
|---------------|----------|-------------|--------------------|-------|
| FUNC001       | Seu Nome | 11999999999 | seuemail@gmail.com | Admin |

> O e-mail precisa ser exatamente o mesmo da conta Google usada para fazer login.

### Passo 4 — Configurar o login Google (OAuth)

1. Acesse [console.cloud.google.com](https://console.cloud.google.com) e crie um novo projeto.
2. Vá em **APIs e Serviços → Tela de consentimento OAuth** → Externo → preencha nome e e-mail.
3. Vá em **Credenciais → + Criar credenciais → ID do cliente OAuth** → tipo **Aplicativo da Web**.
4. Em **Origens JavaScript autorizadas**, adicione:
   - `http://localhost` (testes locais)
   - `https://SEU-USUARIO.github.io`
5. Copie o **ID do cliente** (formato `xxxxxxxxx.apps.googleusercontent.com`).

### Passo 5 — Configurar o frontend

Abra `js/app.js` e edite as três linhas no topo do arquivo:

```javascript
const CONFIG = {
  SALON_NAME:        'Nome do Seu Salão',
  WEBAPP_URL:        'https://script.google.com/macros/s/SEU_SCRIPT_ID/exec',
  GOOGLE_CLIENT_ID:  'SEU_CLIENT_ID.apps.googleusercontent.com',
  // ... o resto não precisa mexer
};
```

### Passo 6 — Publicar no GitHub Pages

1. Crie um repositório público no GitHub.
2. Faça upload de `index.html`, `css/` e `js/` (**não envie** `apps-script/` — é só referência local).
3. No repositório, vá em **Settings → Pages → Source: Deploy from a branch → main / (root)**.
4. Aguarde 1–2 minutos. O sistema estará disponível em:
   ```
   https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/
   ```
5. Volte ao Google Cloud e adicione essa URL nas **Origens JavaScript autorizadas** do seu ID OAuth.

---

## O que muda ao reutilizar este projeto

Para adaptar para outro salão, você precisa alterar **3 coisas**:

| O quê | Onde | O que colocar |
|---|---|---|
| `SPREADSHEET_ID` | `apps-script/Code.gs` linha 6 | ID da nova planilha Google Sheets |
| `WEBAPP_URL` | `js/app.js` linha 10 | URL gerada ao implantar o Apps Script |
| `GOOGLE_CLIENT_ID` | `js/app.js` linha 11 | ID OAuth do projeto no Google Cloud |

Opcionalmente:
- `SALON_NAME` em `js/app.js` — nome exibido na tela de login e no sidebar
- Logo: substitua o arquivo de imagem e atualize o `src` nas linhas 28 e 48 do `index.html`

---

## Estrutura da planilha

As abas são criadas automaticamente pela função `setupSpreadsheet`. Estrutura de cada uma:

### Agendamentos
| AgendamentoID | Data | Horario | ClienteID | ServicoID | Status | Observacoes | FuncionarioID |
|---|---|---|---|---|---|---|---|
| AG0000001 | 2026-06-11 | 09:00 | CLI001 | SVC001 | Confirmado | | FUNC002 |

### Clientes
| ClienteID | Nome | Telefone | Email | Observacoes |
|---|---|---|---|---|
| CLI001 | Maria Silva | 11999887766 | maria@email.com | |

### Servicos
| ServicoID | Nome | Duracao_min | Preco |
|---|---|---|---|
| SVC001 | Corte Feminino | 60 | 80 |

### Funcionarios
| FuncionarioID | Nome | Telefone | Email | Role |
|---|---|---|---|---|
| FUNC001 | Ana Paula | 11988888888 | ana@gmail.com | Admin |

> `Role` aceita `Admin` ou `Funcionario`.

---

## Perfis de acesso

| | Admin | Funcionário |
|---|---|---|
| Ver a própria agenda | ✅ | ✅ |
| Ver agenda de todos | ✅ | ❌ |
| Criar / editar / excluir agendamentos | ✅ | ❌ |
| Gerenciar clientes, serviços e funcionários | ✅ | ❌ |
| Enviar WhatsApp | ✅ | ❌ |

---

## Solução de problemas

| Problema | Causa provável | Solução |
|---|---|---|
| "Usuário não autorizado" | E-mail não cadastrado ou digitado errado | Verifique a aba `Funcionarios` na planilha |
| Agenda não carrega | `WEBAPP_URL` incorreta | Confirme a URL em `app.js` |
| Botão Google não aparece | Domínio não autorizado no OAuth | Adicione o domínio nas origens autorizadas no Google Cloud |
| Dados não salvam | `SPREADSHEET_ID` errado | Confirme o ID em `Code.gs` e reimplante |
| Erro após editar o `Code.gs` | Versão desatualizada | Implantar → Gerenciar implantações → lápis → Nova versão |

---

## Stack

- **Frontend:** HTML5 + CSS3 + JavaScript ES2022 — sem frameworks, sem build step
- **Backend:** Google Apps Script (Web App)
- **Banco de dados:** Google Sheets
- **Autenticação:** Google Identity Services (OAuth 2.0)
- **Hospedagem:** GitHub Pages (gratuito) — ou Netlify/Vercel para repositório privado
