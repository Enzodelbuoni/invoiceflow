# Etapa 02 — Mudança para fora do OneDrive + ajustes de ambiente

**Data:** 2026-10-06
**Status:** ✅ Concluída

## Motivo

O projeto estava em `C:\Users\User\OneDrive\Área de Trabalho\meus-projetos\invoiceflow`. O OneDrive sincronizava `node_modules` (585 MB) e `.next` (87 MB), o que deixa tudo lento e causa erros de arquivo bloqueado (`EPERM`/`EBUSY`). O caminho também tinha espaço e acento. O usuário pediu para mover o projeto e resolver o que mais pudesse atrapalhar.

## O que foi feito

1. **Cópia para `C:\dev\invoiceflow`** com `robocopy /E /XD node_modules .next` (101 arquivos, 0 falhas). `.git` copiado inteiro, com o histórico preservado.
2. **Verificação do git:** `git fsck` sem erros, `git log` com os 2 commits, `git status` limpo.
3. **Finais de linha normalizados:** `docs/info.txt` e `src/lib/utils.js` estavam com CRLF na cópia de trabalho e foram regravados do índice (LF).
4. **`npm ci`** na nova pasta: instalação limpa em ~30s (no OneDrive tinha levado mais de 1 min).
5. **Validação:** `npm run lint` ✅, `npm run build` ✅, `npm run dev` → `GET / 200` ✅.
6. **`.vscode/settings.json`** (novo):
   - `*.css` → `tailwindcss`, para o VS Code não marcar `@theme`, `@apply` e `@custom-variant` como erro.
   - `tailwindCSS.classFunctions: ["cn", "cva"]`, para ter autocomplete de classes dentro de `cn()`.
   - `files.eol: "\n"`, para combinar com o `.gitattributes`.
   - `.next` fora da busca e do watcher.
7. **`.vscode/extensions.json`** (novo): recomenda Tailwind CSS IntelliSense, ESLint e Prettier (o usuário já tem as três instaladas).
8. **`package.json`:** `engines.node >= 20.9.0`.
9. **Pasta antiga no OneDrive:** conteúdo removido depois da verificação (ver "Resultado da remoção da pasta antiga" abaixo).

## O que o usuário precisa fazer

- Fechar o VS Code e abrir a pasta **`C:\dev\invoiceflow`** (Arquivo → Abrir Pasta).
- Abrir o Claude Code de novo nessa pasta. O `CLAUDE.md` carrega a memória automaticamente.
- Apagar a pasta vazia antiga no OneDrive, se ela ainda existir (ela fica bloqueada enquanto o VS Code estiver aberto nela).

## Resultado da remoção da pasta antiga

Todo o conteúdo de `OneDrive\Área de Trabalho\meus-projetos\invoiceflow` foi apagado, inclusive `node_modules` e `.next`. Só a pasta raiz vazia continua lá, porque estava em uso pelo VS Code e pela sessão do Claude. O usuário pode apagá-la depois de reabrir o VS Code em `C:\dev\invoiceflow`. A pasta `meus-projetos` não foi tocada.

## Sugestão não aplicada (requer admin)

- Adicionar `C:\dev` às exclusões do Windows Defender acelera bastante o `npm install` e o build. É uma configuração de segurança do sistema, então fica a critério do usuário.
