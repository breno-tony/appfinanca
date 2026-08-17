# Configurar o Supabase — Meu Financeiro

Esta versão possui login por e-mail e senha e sincronização do estado do app na nuvem.

## 1. Crie/abra seu projeto no Supabase
No painel do Supabase, abra o projeto que será usado pelo app.

## 2. Crie a tabela e as regras de segurança
Abra **SQL Editor > New query**.

Cole todo o conteúdo do arquivo:

`supabase_setup.sql`

Clique em **Run**.

Isso cria a tabela `finance_state` e habilita RLS para que cada conta autenticada acesse apenas os próprios dados.

## 3. Crie seu usuário
No painel do Supabase, abra a área de **Authentication / Users** e crie o usuário que você usará no financeiro.

Use seu e-mail e uma senha segura.

O app não tem cadastro público: só entra quem já possuir usuário no seu Supabase.

## 4. Pegue URL e chave pública
No painel do projeto, localize a **Project URL** e a chave pública do projeto (**Publishable key**; projetos que ainda exibem a nomenclatura antiga podem mostrar uma `anon` key).

Abra:

`supabase-config.js`

e troque:

`COLE_AQUI_SUA_PROJECT_URL`

e:

`COLE_AQUI_SUA_PUBLISHABLE_OU_ANON_KEY`

pelos valores do seu projeto.

### Importante
Use apenas a chave pública/publishable/anon no navegador.

**Nunca coloque a `service_role` key no projeto frontend.**

## 5. Rode ou publique
Para testar no VS Code, uma opção simples é usar Live Server.

Também pode usar:

`python -m http.server 8080`

e abrir:

`http://localhost:8080`

Para usar em qualquer PC, publique a pasta em um serviço estático como Vercel.

## Como funciona
- Abre o site.
- A tela de login pede e-mail e senha.
- Após o login, o app consulta `finance_state` usando o ID do usuário autenticado.
- Se já houver dados, carrega tudo.
- Se for o primeiro acesso, cria o estado inicial.
- Cada alteração também continua salva no navegador como cópia local e é enviada automaticamente ao Supabase.
- Em outro PC, basta entrar com a mesma conta.

## Estrutura escolhida
Para manter este MVP simples, todas as configurações, movimentações, categorias e vendas ficam reunidas em um único JSON por usuário.

Isso evita reescrever o app inteiro agora e já resolve a sincronização entre dispositivos.
