## Passo a passo: o que o sistema faz e como rodar

### Visão geral

1. **MongoDB** guarda usuários e cobranças criadas pelo app.
2. **Backend (NestJS)** expõe `/auth/register`, `/auth/login` (JWT) e `/charges` (protegido). Ao criar uma cobrança, o serviço chama a **API Lytex sandbox** (`obtain_token` → `payment_links`) e grava no Mongo o retorno (link, IDs, payload PIX/boleto quando vierem na resposta).
3. **Cartão**: fluxo `card_token` + `invoices/pay` (exposto em `POST /charges/:id/pay-card`). É necessário que a resposta de `payment_links` traga um `_invoiceId` (ou equivalente) para o pagamento; caso contrário, use o **link de pagamento** aberto no navegador.
4. **Frontend (Angular + Material)** cadastra e autentica o usuário, envia o JWT no header e oferece o dashboard para criar cobranças, copiar PIX/boleto e simular “pago” para PIX/boleto.

Documentação oficial da API: [docs-pay.lytex.com.br](https://docs-pay.lytex.com.br/).

### Rodar com Docker Compose (API + Mongo)

1. Na raiz do repositório, copie `.env.example` para `.env` e preencha `LYTEX_CLIENT_ID` e `LYTEX_CLIENT_SECRET` do painel sandbox. Também é necessário preencher JWT_SECRET, e o mesmo também tem de ser preenchido no docker-compose.yml
2. Execute: `docker compose up --build`
3. API: `http://localhost:3000` · Swagger: `http://localhost:3000/docs`
4. Suba o frontend localmente (abaixo), apontando para a API em `http://localhost:3000` (`frontend/src/environments/environment.ts`).

### Rodar o frontend (desenvolvimento)

1. `cd frontend`
2. `npm install`
3. `npm start` (abre em `http://localhost:4200`)
4. Cadastre-se, faça login e use o dashboard.


### Integração Lytex (sandbox)

- Token: `POST https://sandbox-api-pay.lytex.com.br/v2/auth/obtain_token` com `{ "clientId", "clientSecret" }`.
- Link / fatura: `POST .../v2/payment_links` (PIX, boleto e habilitação de cartão conforme o corpo enviado).
- Cartão: `POST .../v2/invoices/card_token` e `POST .../v2/invoices/pay`.

Variável opcional `LYTEX_API_BASE` (padrão já é a URL sandbox `/v2`).


####  Testes

Para realização de teste, entrar na pasta backend e realizar o comando:

`cd backend`
`npm run test`

Testes realizados nos services API Lytex, autenticação e cobranças (charges);

## Documentação SWAGGER

Para acessar o swagger, colocar a rota /docs no backend. (Exemplo: http://localhost:3000/docs).

Observação: para consumir a API, é necessário realizar a autenticação pelo endpoint /auth/login para obter o access token e passar o mesmo no Authorization.
