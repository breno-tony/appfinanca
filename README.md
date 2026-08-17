# Meu Financeiro — versão pronta com Supabase

Esta pasta já está configurada com o seu projeto Supabase.

## Já configurado
- Project URL: `https://cuofjjvwgsgkhqhonrwc.supabase.co`
- Publishable Key: já preenchida em `supabase-config.js`
- Login por e-mail e senha
- Sessão persistente
- Sincronização entre computadores
- RLS por usuário
- Backup JSON
- Sem cadastro público no site

## Antes de publicar

### 1. Rode o SQL
No Supabase:
**SQL Editor > New query**

Cole o conteúdo de `supabase_setup.sql` e clique em **Run**.

### 2. Crie seu usuário
No Supabase:
**Authentication > Users**

Crie o e-mail e a senha que serão usados no app.

Se seu projeto exigir confirmação de e-mail, confirme esse usuário no painel ou pelo e-mail enviado.

### 3. Publique
Envie todos os arquivos desta pasta para o GitHub/Vercel, mantendo `index.html` na raiz.

Arquivos importantes:
- `index.html`
- `app.js`
- `styles.css`
- `supabase-config.js`
- `sw.js`
- `manifest.json`

## Teste rápido
Depois do deploy, abra no navegador:

`SEU-DOMINIO/supabase-config.js`

Você deve ver a URL do projeto e uma `sb_publishable_...`.

No Console (F12), estes comandos devem funcionar:

`window.SUPABASE_CONFIG`

`typeof window.supabase`

`typeof window.supabase.createClient`

Os dois últimos devem resultar em `"object"` e `"function"`.

## Segurança
A chave incluída é a **Publishable Key**, própria para uso no frontend.
Não coloque `service_role` ou Secret Key no site.

## Cache/Vercel
Esta versão inclui `vercel.json` para impedir cache antigo de `index.html`, `app.js` e `supabase-config.js`.
Ela também remove automaticamente Service Workers antigos do navegador para evitar o problema de “Supabase ainda não configurado” após um novo deploy.
