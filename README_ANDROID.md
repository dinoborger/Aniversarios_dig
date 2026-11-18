# Aniversários Pro — Interface Android (PWA)

## Funcionalidades
Adicionar, editar, eliminar, pesquisar e ativar/desativar aniversários; importação/exportação CSV; sincronização manual com GitHub. A interface funciona no navegador Android e pode ser instalada no ecrã inicial. Não gera um APK nativo.

## Publicação
1. Carrega o conteúdo deste ZIP para um repositório **privado** no GitHub, mantendo as pastas `.github`, `app` e `data`.
2. Para alojar a interface, publica **apenas a pasta `app/`** num alojamento HTTPS estático com controlo de acesso, ou num site estático sem incluir dados pessoais. GitHub Pages pode tornar o site acessível publicamente mesmo quando o repositório é privado; confirma as definições do plano e não publiques o CSV no site.
3. No Android abre o endereço HTTPS da interface; no Chrome usa «Adicionar ao ecrã principal» ou «Instalar aplicação».
4. Cria um GitHub fine-grained personal access token com acesso apenas ao repositório de dados e permissão **Contents: Read and write**. Não o coloques em ficheiros, URLs ou código público.
5. Preenche utilizador, repositório, branch e token na interface. Usa «Carregar do GitHub» antes de editar; depois «Guardar no GitHub».
6. O token é mantido só em memória durante a sessão. Nunca é gravado no armazenamento local. O GitHub Actions lê `data/aniversarios.csv` em cada execução.

## Segurança e limites
- Os dados de aniversários ficam no `localStorage` do navegador e não são cifrados. Usa apenas dispositivos de confiança; evita dados pessoais em alojamentos públicos.
- A sincronização é manual; sem token ou ligação à internet a edição é apenas local.
- Em caso de edição simultânea, a aplicação verifica conflitos quando já carregaste uma versão remota. Faz cópia CSV antes de substituir.
- O envio Microsoft Graph só funciona depois da autorização da equipa Microsoft 365 e configuração dos Secrets. Mantém DRY_RUN=true até validares.
- Um token GitHub no browser é uma solução prática para uso pessoal, mas uma versão institucional deve usar backend autenticado, controlo de acessos e auditoria.
