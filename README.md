# Aniversários Pro — Microsoft 365

Envia avisos para sete destinatários institucionais via **Microsoft Graph** (não SMTP).

## 1. Preparação Microsoft 365 (administrador)

1. Criar uma aplicação no Microsoft Entra ID (App registrations).
2. Guardar **Tenant ID**, **Client ID** e criar um **Client secret** (preferir certificado ou identidade federada para produção).
3. Em API permissions, Microsoft Graph > **Application permissions** > **Mail.Send**; conceder **admin consent**.
4. **Restringir a aplicação à caixa remetente aprovada**, com Exchange Online Application RBAC (ou política equivalente suportada). Não ativar a app sem esta restrição: Mail.Send de aplicação pode, sem restrições, enviar em nome de múltiplas caixas do tenant.
5. Confirmar que a conta remetente possui uma caixa Exchange Online e autorização institucional para envio.

## 2. Configurar GitHub (Android ou computador)

Criar repositório **privado**. Carregar `enviar.py`, `requirements.txt`, `data/aniversarios.csv` e `.github/workflows/avisos.yml` mantendo os caminhos. Em **Settings > Secrets and variables > Actions > Secrets**, criar:

- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `MAIL_SENDER` (endereço da caixa remetente aprovada)

Em **Variables**, criar `DRY_RUN` com valor `true` inicialmente. Mudar para `false` apenas após validação e autorização.

## 3. Base de dados

Editar `data/aniversarios.csv`: `nome,data_nascimento,ativo` com datas `AAAA-MM-DD` e `sim`/`nao`. O ficheiro de exemplo está desativado. Como contém dados pessoais, manter o repositório privado e acesso limitado. Evitar registar datas de nascimento nos logs.

## 4. Teste e ativação

No separador Actions, selecionar **Avisos de aniversarios** > **Run workflow**. A opção manual também respeita a hora de Lisboa; para testar localmente fora das 09:00, usar `ENFORCE_HOUR=false DRY_RUN=true python enviar.py`. O cron corre às 08:00 e 09:00 UTC, e o código só envia quando for 09:00 em Europe/Lisbon. Atrasos ocasionais no GitHub Actions são possíveis; não há garantia de execução exata às 09:00. O GitHub Actions não oferece garantia de execução única em caso de reexecução manual ou repetição do workflow.

## 5. Segurança e operação

- Nunca colocar passwords, tokens ou segredos no repositório.
- O envio real requer autorização de TI e `DRY_RUN=false`.
- Se o envio for recusado, confirmar permissões Graph, políticas Exchange e restrições de acesso da app.
- Este projeto **não usa o servidor MX nem SMTP**. Se TI exigir SMTP, é necessário implementar outro transporte com OAuth2 e confirmar a política do tenant.
- Para produção crítica, acrescentar armazenamento persistente de idempotência, auditoria e alertas de falha; esta versão é um MVP.
- Para calendários de 29 de fevereiro, a política implementada em anos não bissextos é 28 de fevereiro.
