# Meu Financeiro — V6 Supabase

Esta versão elimina o problema "Supabase ainda não configurado".

## O que mudou
- Project URL está embutida diretamente no `index.html`.
- Publishable Key está embutida diretamente no `index.html`.
- Não existe mais `supabase-config.js`.
- Não existe mais Service Worker.
- `app.js` virou `app-v6.js`.
- `styles.css` virou `styles-v6.css`.
- `vercel.json` força `no-store` para os arquivos principais.
- Ao carregar, o site tenta remover Service Workers e caches antigos.

## Supabase configurado
Project URL:
https://cuofjjvwgsgkhqhonrwc.supabase.co

Publishable Key:
sb_publishable_-TPXzLVpvyiA3QFuyo_wdQ_ozoaQr2M

## Antes de usar
1. No Supabase, abra SQL Editor.
2. Execute `supabase_setup.sql`.
3. Em Authentication > Users, crie seu usuário com e-mail e senha.
4. Substitua TODOS os arquivos antigos do repositório pelos arquivos desta pasta.
5. Faça commit + push.
6. Aguarde o deploy da Vercel ficar Ready.
7. Na primeira abertura, use:
   `https://SEU-DOMINIO.vercel.app/?v=6`

Depois disso pode usar o endereço normal.

## Teste no Console
`window.SUPABASE_CONFIG`

Deve mostrar a URL e a Publishable Key.

`typeof window.supabase`

Deve retornar `"object"`.

`typeof window.supabase.createClient`

Deve retornar `"function"`.


## V7 — bloqueio manual da porcentagem de comissão

Agora existe um controle em **Vendas & comissão** para travar apenas a porcentagem.

Exemplo:
- vendas atuais: R$ 320.000
- percentual automático: 1,5%
- trava ativada: 1,5%
- novas vendas levam o total para R$ 450.000
- total vendido continua R$ 450.000
- percentual continua 1,5%
- comissão = R$ 450.000 × 1,5%

Ao desligar a trava, o app volta imediatamente ao percentual automático correspondente ao total vendido.
