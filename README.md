- NestJS
- Angular 17+
- MongoDB
- JWT
- Jest
- Arquitetura limpa
- APIs REST
- TypeScript

Sua tarefa é me ajudar a desenvolver um projeto fullstack para um desafio técnico.

IMPORTANTE:
- Sempre gerar código limpo e organizado
- Seguir boas práticas
- Utilizar arquitetura modular
- Evitar complexidade desnecessária
- Priorizar código profissional e legível
- Utilizar TypeScript corretamente
- Sempre separar responsabilidades
- Sempre usar DTOs no NestJS
- Sempre validar dados com class-validator
- Sempre tratar erros corretamente
- Sempre comentar apenas quando realmente necessário
- Nunca gerar código bagunçado
- Nunca misturar lógica de negócio em controllers
- Nunca usar any sem necessidade

==================================================
STACK OBRIGATÓRIA
==================================================

BACKEND:
- Node.js
- NestJS
- MongoDB com Mongoose
- JWT Authentication
- Jest
- Swagger

FRONTEND:
- Angular 17+
- Angular Material
- RxJS

==================================================
OBJETIVO DO PROJETO
==================================================

Criar uma aplicação fullstack de cobranças integrada à API Lytex Sandbox.

A aplicação deve permitir:

1. Cadastro de usuários
2. Login JWT
3. Proteção de rotas autenticadas
4. Criar cobranças
5. Listar cobranças
6. Simular liquidação de cobranças

Métodos de pagamento:
- PIX
- BOLETO
- CREDIT_CARD

==================================================
ESTRUTURA BACKEND
==================================================

Criar backend modular utilizando:

src/
│
├── auth/
├── users/
├── charges/
├── lytex/
├── common/
├── config/
│
├── app.module.ts
└── main.ts

==================================================
REGRAS BACKEND
==================================================

AUTH:
- Senha criptografada com bcrypt
- Login JWT
- Guards JWT
- Rotas protegidas

DTOs:
- Utilizar DTOs em todas as entradas
- Utilizar class-validator

VALIDAÇÃO:
- ValidationPipe global

ERROS:
- Utilizar:
  - BadRequestException
  - UnauthorizedException
  - NotFoundException

Nunca usar:
- throw new Error()

CONTROLLERS:
- Controllers devem ser simples
- Sem regra de negócio

SERVICES:
- Toda lógica de negócio nos services

LYTEX:
- Criar módulo separado
- Não misturar integração externa com regras de cobrança

TESTES:
- Criar testes unitários com Jest
- Testar AuthService
- Testar ChargesService

SWAGGER:
- Configurar documentação automática

==================================================
ESTRUTURA FRONTEND
==================================================

src/app/
│
├── core/
├── auth/
├── charges/
├── shared/

==================================================
REGRAS FRONTEND
==================================================

AUTH:
- Login JWT
- Salvar token no localStorage
- HTTP Interceptor para adicionar token
- Route Guard protegendo dashboard

TELAS:
- Login
- Register
- Dashboard

DASHBOARD:
- Criar cobrança
- Listar cobranças
- Exibir status

UI:
- Utilizar Angular Material
- Interface simples e funcional
- Sem foco em design avançado

COMPONENTIZAÇÃO:
- Separar componentes corretamente
- Evitar código gigante

SERVICES:
- Serviços separados para API

==================================================
BANCO DE DADOS
==================================================

MongoDB

Coleções principais:
- users
- charges

==================================================
MODELO USER
==================================================

Campos:
- name
- email
- password

==================================================
MODELO CHARGE
==================================================

Campos:
- amount
- method
- status
- externalId
- createdBy
- createdAt

==================================================
STATUS
==================================================

PENDING
PAID
FAILED

==================================================
PAYMENT METHODS
==================================================

PIX
BOLETO
CREDIT_CARD

==================================================
ROTAS BACKEND
==================================================

AUTH:
POST /auth/register
POST /auth/login

CHARGES:
POST /charges
GET /charges
PATCH /charges/:id/pay

==================================================
QUALIDADE ESPERADA
==================================================

O código deve parecer código de desenvolvedor pleno/sênior.

Prioridades:
1. Organização
2. Clareza
3. Arquitetura
4. Boas práticas
5. Legibilidade
6. Separação de responsabilidades
7. Segurança
8. Escalabilidade simples

==================================================
O QUE EVITAR
==================================================

- Arquitetura exageradamente complexa
- Microservices
- DDD complexo
- Código duplicado
- Controllers gigantes
- Services misturados
- Gambiarra
- Código sem tipagem
- Código sem validação
- Código sem tratamento de erro

==================================================
SEMPRE QUE GERAR CÓDIGO
==================================================

- Explique rapidamente a função do código
- Gere estrutura de pastas quando necessário
- Gere código completo
- Gere imports completos
- Gere exemplos reais
- Gere código pronto para produção simples
- Utilize TypeScript moderno
- Utilize async/await corretamente
- Utilize clean code

==================================================
QUANDO GERAR BACKEND
==================================================

Sempre:
- gerar schema
- dto
- service
- controller
- module
- testes quando solicitado

==================================================
QUANDO GERAR FRONTEND
==================================================

Sempre:
- component
- html
- scss
- service
- routes quando necessário

==================================================
AMBIENTE
==================================================

Variáveis .env:

PORT=3000

MONGO_URL=mongodb://localhost:27017/lytex

JWT_SECRET=supersecret

LYTEX_CLIENT_ID=SEU_CLIENT_ID

LYTEX_CLIENT_SECRET=SEU_CLIENT_SECRET

==================================================
PADRÃO FINAL
==================================================

O projeto deve:
- rodar localmente
- ser simples de entender
- parecer profissional
- ser fácil de testar
- ser fácil de manter
- impressionar avaliadores técnicos

---

## Passo a passo: o que o sistema faz e como rodar

### Visão geral

1. **MongoDB** guarda usuários e cobranças criadas pelo app.
2. **Backend (NestJS)** expõe `/auth/register`, `/auth/login` (JWT) e `/charges` (protegido). Ao criar uma cobrança, o serviço chama a **API Lytex sandbox** (`obtain_token` → `payment_links`) e grava no Mongo o retorno (link, IDs, payload PIX/boleto quando vierem na resposta).
3. **Cartão**: fluxo `card_token` + `invoices/pay` (exposto em `POST /charges/:id/pay-card`). É necessário que a resposta de `payment_links` traga um `_invoiceId` (ou equivalente) para o pagamento; caso contrário, use o **link de pagamento** aberto no navegador.
4. **Frontend (Angular + Material)** cadastra e autentica o usuário, envia o JWT no header e oferece o dashboard para criar cobranças, copiar PIX/boleto e simular “pago” para PIX/boleto.

Documentação oficial da API: [docs-pay.lytex.com.br](https://docs-pay.lytex.com.br/).

### Rodar com Docker Compose (API + Mongo)

1. Na raiz do repositório, copie `.env.example` para `.env` e preencha `LYTEX_CLIENT_ID` e `LYTEX_CLIENT_SECRET` do painel sandbox.
2. Execute: `docker compose up --build`
3. API: `http://localhost:3000` · Swagger: `http://localhost:3000/docs`
4. Suba o frontend localmente (abaixo), apontando para a API em `http://localhost:3000` (`frontend/src/environments/environment.ts`).

### Rodar o frontend (desenvolvimento)

1. `cd frontend`
2. `npm install`
3. `npm start` (abre em `http://localhost:4200`)
4. Cadastre-se, faça login e use o dashboard.

### Rodar só o Mongo no Docker e o resto na máquina

1. `docker compose up mongo` (ou serviço `mongo` apenas, se preferir editar o compose).
2. Backend: `cd backend` → copie variáveis do `.env.example` para `backend/.env` → `npm install` → `npm run start:dev`
3. Frontend: como acima.

### Integração Lytex (sandbox)

- Token: `POST https://sandbox-api-pay.lytex.com.br/v2/auth/obtain_token` com `{ "clientId", "clientSecret" }`.
- Link / fatura: `POST .../v2/payment_links` (PIX, boleto e habilitação de cartão conforme o corpo enviado).
- Cartão: `POST .../v2/invoices/card_token` e `POST .../v2/invoices/pay`.

Variável opcional `LYTEX_API_BASE` (padrão já é a URL sandbox `/v2`).
