# Site Sabrine

Site com login e senha (Supabase Auth), menu e área de documentos.
Feito em Next.js, publicado na Vercel a partir do GitHub.

## Estrutura

- `app/page.tsx` — tela de login (página inicial)
- `app/(privado)/` — tudo aqui dentro exige login
  - `menu/page.tsx` — menu; novas funções entram na lista `itens`
  - `documentos/page.tsx` — lista de documentos
- `proxy.ts` — renova a sessão e bloqueia quem não está logado
- `supabase/schema.sql` — tabela e bucket de documentos

## Banco local (sem Supabase)

Enquanto não existir `.env.local` com as chaves do Supabase, `npm run dev` usa um
banco SQLite em `local/banco.db`, criado sozinho na primeira execução.

- Usuários e documentos de teste: `local/dados-iniciais.json`
- Arquivos dos documentos: `local/arquivos/`
- Para aplicar mudanças no JSON, apague `local/banco.db` e reinicie o servidor.

O banco local só funciona em desenvolvimento; o site publicado exige o Supabase.

## Configuração do Supabase

1. **Supabase**: crie um projeto, rode `supabase/schema.sql` no SQL Editor e
   crie os usuários em Authentication > Users > Add user (marque "Auto Confirm User").
   Em Authentication > Sign In / Providers, desative "Allow new users to sign up".
2. **Local**: copie `.env.example` para `.env.local`, preencha as duas chaves e rode `npm run dev`.
3. **Vercel**: importe o repositório do GitHub e cadastre as mesmas duas variáveis em
   Settings > Environment Variables.

## Adicionar um documento

1. Supabase > Storage > bucket `documentos` > envie o arquivo (ex.: `manual.pdf`).
2. Supabase > Table Editor > `documentos` > Insert row: `titulo`, `descricao` (opcional)
   e `caminho` igual ao nome do arquivo no bucket (ex.: `manual.pdf`).
