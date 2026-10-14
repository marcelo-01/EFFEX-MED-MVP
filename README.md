# Effex Med — MVP

Aplicativo de demonstração para **centralizar a comunicação entre médico e paciente**, tirando a conversa do
WhatsApp pessoal e dando ao médico controle sobre **quando** é notificado e **até quando** cada paciente pode
enviar mensagens (até a data do retorno).

| Visão do médico | Visão do paciente |
| --- | --- |
| Cadastro com aceites da LGPD / login | Cadastro com aceites da LGPD / login |
| Chat com os pacientes (estilo WhatsApp) | Chat com os médicos que o cadastraram |
| **Pacientes**: cadastro por e-mail, prazo do chat, extensão de prazo | Pedido de extensão quando o prazo termina |
| **Ajustes**: horário de notificações e mensagem padrão | |

## Como rodar

### Opção 1 — Docker (um comando)

```bash
docker compose up --build
```

Acesse **http://localhost:8080**. Os dados ficam no volume `effex-med-data`.

### Opção 2 — Desenvolvimento (backend + frontend separados)

Pré-requisitos: **Java 21** e **Node 20+**.

```bash
# Terminal 1 — API (porta 8080)
cd backend
./mvnw spring-boot:run

# Terminal 2 — frontend com hot reload (porta 5173)
cd frontend
npm install
npm run dev
```

Acesse **http://localhost:5173** (o Vite encaminha `/api` e `/ws` para o Spring Boot). Para abrir no celular,
use o IP da máquina na mesma rede, ex.: `http://192.168.0.10:5173`.

### Opção 3 — Jar único

```bash
cd frontend && npm install && npm run build   # gera frontend/dist
cd ../backend && ./mvnw package               # o jar já inclui o frontend
java -jar target/effex-med-api-0.1.0.jar      # http://localhost:8080
```

### Opção 4 — Versão web sem backend (página estática)

```bash
cd frontend && npm install && npm run build:standalone
# gera frontend/dist-standalone/effex-med.html (HTML único, ~390 KB)
```

Esse modo roda o mesmo frontend com um backend simulado no próprio navegador (`frontend/src/standalone/server.ts`),
que reproduz a API e as regras de negócio. Os dados ficam no `localStorage` de quem abre a página e as abas abertas
no mesmo navegador conversam em tempo real (BroadcastChannel), então dá para abrir o médico numa aba e o paciente em
outra. É a versão publicada no Claude Artifacts. Ela não compartilha dados entre aparelhos diferentes; para isso é
preciso rodar o backend Spring Boot.

## Contas de demonstração

Criadas automaticamente quando o banco está vazio (`app.demo-data=true`). Senha de todas: **`demo123`**.
Na tela de login há atalhos para entrar com um clique.

| Conta | Perfil | O que demonstra |
| --- | --- | --- |
| `ana@effexmed.com` | Dra. Ana Souza — Cardiologia | Painel completo: 5 pacientes em situações diferentes |
| `carlos@effexmed.com` | Dr. Carlos Mendes — Clínica Geral | Segundo médico que atende os mesmos pacientes |
| `joao@email.com` | Paciente | Atendido por **2 médicos**; tem mensagens enviadas fora do horário |
| `maria@email.com` | Paciente | Prazo terminando em 2 dias |
| `pedro@email.com` | Paciente | Prazo **encerrado** e pedido de extensão em aberto |
| `rafael@email.com` | Paciente | Conversa nova: ao enviar a 1ª mensagem recebe a **mensagem padrão** |
| `lucia@email.com` | (sem conta) | Cadastrada pela Dra. Ana: crie a conta com este e-mail e o chat aparece |

### Roteiro sugerido para a apresentação

1. Entre como **Dra. Ana** → aba *Conversas*: veja não lidas, prazos e o marcador 🌙 *fora do horário*.
2. Aba **Ajustes**: altere o horário de notificações e a mensagem padrão (com pré-visualização).
3. Aba **Pacientes**: cadastre um e-mail novo escolhendo o prazo do chat, edite a data de retorno e estenda o prazo
   do Pedro.
4. Em outra janela anônima, entre como **Pedro**: antes da extensão o chat fica bloqueado; depois, liberado.
5. Entre como **Rafael** e envie uma mensagem: a mensagem padrão chega na hora; a Dra. Ana vê em tempo real
   (com "digitando…" e confirmação de leitura).
6. Crie a conta da **Lúcia** (`lucia@email.com`) e veja a conversa com a Dra. Ana aparecer automaticamente.

## Regras de negócio implementadas

- **Cadastro de pacientes por e-mail**: o médico informa só o e-mail (nome e data de retorno são opcionais). Se o
  paciente ainda não tem conta, o vínculo fica pendente e é ligado automaticamente quando ele se cadastra com
  aquele e-mail. Vários médicos podem cadastrar o mesmo e-mail.
- **Prazo da conversa**: definido no cadastro do paciente, pela data do retorno (atalhos de 7 a 90 dias; padrão de
  30 dias). O chat fica
  disponível até o fim desse dia; depois disso **o paciente não consegue enviar mensagens** (o médico continua
  podendo escrever). Status: *Ativo*, *Expira em X dias* (≤ 3 dias), *Prazo encerrado*.
- **Extensão de prazo**: o médico estende pela quantidade de dias desejada (atalhos de 7/15/30/60 dias ou valor
  livre), com observação opcional (ex.: "pagamento confirmado na recepção") e histórico. Se o prazo já acabou, a
  contagem parte de hoje. O paciente pode **solicitar** a extensão pelo app quando o prazo termina. Não há pagamento na
  plataforma neste MVP.
- **Horário de notificações**: dias da semana + horário (inclusive janelas que passam da meia-noite). Dentro da
  janela o médico recebe alerta (som, toast e notificação do navegador); fora dela a mensagem chega em silêncio e
  fica marcada como *fora do horário*. O paciente vê se o médico está ou não em horário de atendimento.
- **Mensagem padrão**: enviada automaticamente (marcada como *Mensagem automática*) quando o **paciente inicia** a
  conversa, ou seja, na primeira mensagem dele. Se o médico iniciou a conversa, ela não é enviada.
- **Remoção de paciente**: permitida apenas enquanto não houver mensagens trocadas (para não perder histórico).
- **LGPD no cadastro**: caixas de aceite desmarcadas por padrão para Termos de Uso e Política de Privacidade (com os
  textos em modal), além de um aceite específico por perfil: o paciente autoriza o tratamento de **dados de saúde** em
  destaque (art. 11, I) e o médico declara CRM ativo e dever de sigilo. Receber novidades por e-mail é opcional. Os
  aceites são validados no backend e gravados em `user_consents` com tipo, versão do documento e data (prova do
  consentimento, art. 8º, § 2º). Os textos são uma **versão preliminar** e devem ser revisados por um advogado antes
  do lançamento.

## Arquitetura

```
EFFEX-MED-MVP/
├── backend/   Spring Boot 4.1 · Java 21 · Spring Security (JWT) · JPA/H2 · WebSocket (STOMP)
└── frontend/  React 19 · TypeScript · Vite · React Router · @stomp/stompjs
```

### Backend (`backend/src/main/java/com/effexmed`)

| Pacote | Responsabilidade |
| --- | --- |
| `auth` | Cadastro de médico/paciente, login e emissão do JWT (HS256 via `spring-security-oauth2-jose`) |
| `user` | Entidade `User` (papel `DOCTOR` ou `PATIENT`) e `UserConsent` (aceites da LGPD) |
| `settings` | `DoctorSettings`: janela de notificações e mensagem padrão |
| `patient` | Painel do médico: cadastro de pacientes, edição de prazo, extensões (`/api/doctor/patients`) |
| `chat` | `Conversation` (vínculo médico ⇄ e-mail do paciente), `Message`, `ConversationExtension` e as regras do chat |
| `realtime` | Eventos em tempo real (enviados **após o commit** via `@TransactionalEventListener`) e indicador "digitando" |
| `config` | Segurança, CORS, WebSocket (autenticação do STOMP `CONNECT` com o mesmo JWT) e fallback do SPA |
| `demo` | `DemoDataLoader` com dados relativos à data atual |

Decisões principais:

- **Envio por REST, recebimento por WebSocket**: `POST /api/conversations/{id}/messages` valida e persiste; o
  servidor publica o evento para `/user/queue/events` de cada participante. Simplifica validação e tratamento de
  erros no cliente.
- **Quem decide se notifica é o servidor** (`ChatEvent.alert`), com base na janela do médico. Isso já deixa o
  caminho pronto para push notifications no app mobile.
- **Fuso horário da clínica** em `app.timezone` (padrão `America/Sao_Paulo`), usado para prazos e janela de
  notificações via um `Clock` injetável.
- **Erros** no formato RFC 9457 (`ProblemDetail`), com mensagens em português prontas para exibição.
- **Banco**: H2 em arquivo (`./data`) para a demo. Para PostgreSQL basta adicionar o driver e definir
  `DATABASE_URL`, `DATABASE_USERNAME` e `DATABASE_PASSWORD`.

### API

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/api/auth/register/doctor` · `/api/auth/register/patient` | Cadastro |
| POST | `/api/auth/login` | Login (retorna JWT) |
| GET | `/api/auth/me` | Usuário autenticado |
| GET/PUT | `/api/doctor/settings` | Configurações do médico |
| GET/POST | `/api/doctor/patients` | Lista / cadastra paciente (por e-mail) |
| PATCH/DELETE | `/api/doctor/patients/{id}` | Edita nome e data de retorno / remove |
| GET/POST | `/api/doctor/patients/{id}/extensions` | Histórico / estende o prazo |
| GET | `/api/conversations` · `/api/conversations/{id}` | Conversas do usuário (médico ou paciente) |
| GET/POST | `/api/conversations/{id}/messages` | Mensagens / envia mensagem |
| POST | `/api/conversations/{id}/read` | Marca como lidas |
| POST | `/api/conversations/{id}/extension-request` | Paciente solicita extensão |
| WS | `/ws` (STOMP) | Assinar `/user/queue/events`; enviar `/app/conversations/{id}/typing` |

### Testes

```bash
cd backend && ./mvnw test
```

Cobrem a janela de notificações, as regras de prazo/extensão e o fluxo completo via MockMvc (aceites da LGPD,
vínculo por e-mail, mensagem padrão, bloqueio após o prazo, extensão, confirmação de leitura e controle de acesso).

> O schema é gerado pelo Hibernate (`ddl-auto: update`). Se você já tinha rodado uma versão anterior, apague a pasta
> `backend/data` para recriar o banco de demonstração.

## Próximos passos sugeridos

- Migrações com Flyway e PostgreSQL em produção.
- Push notifications (app mobile / PWA com service worker) respeitando a janela do médico.
- Envio de arquivos (exames, receitas) no chat.
- Pagamento da extensão de prazo integrado à plataforma.
- Leitura de bulas para montar a agenda de medicamentos do paciente.
- Parceria com farmácias para indicar onde encontrar o medicamento prescrito.
- Convite automático por e-mail ao cadastrar um paciente sem conta; recuperação de senha.
