# Contribuindo com o VisuAlgCode

## Rodando o projeto

Você precisa do Node.js 20 ou mais novo.

```bash
git clone https://github.com/the-spanish-guy/visualgcode.git
cd visualgcode
npm install
npm run dev
```

## Antes de abrir o PR

1. Faça um fork e crie uma branch a partir da `main`. Algo como `feat/nova-funcao` já ajuda a entender do que se trata.
2. Tente manter o PR focado em uma coisa só.
3. Rode isso e veja se não há nenhum erro:

   ```bash
   npm run check    # lint e formatação
   npm test         # testes
   npm run build    # build completo
   ```

4. No PR, conte qual era o problema, o que você fez e como testou.

Se mexer no interpretador (`src/interpreter/`), inclua testes. Os arquivos `*.spec.ts` que já existem servem de exemplo.

Achou um bug mas não quer corrigir(ou corrigiu mesmo assim)? Abra uma [issue](https://github.com/the-spanish-guy/visualgcode/issues/new) com o que aconteceu, como reproduzir e qual sistema e versão você usa.

## Mensagens de commit

Usamos o padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/). Isso porque o [git-cliff](https://git-cliff.org) lê as mensagens para montar o `CHANGELOG.md` e as notas de cada release.

O formato é este:

```
tipo(escopo): descrição curta

Corpo opcional, para explicar o porquê da mudança.
```

### Tipos

- `feat`: funcionalidade nova
- `fix`: correção de bug
- `perf`: melhoria de performance
- `refactor`: mudança no código que não altera o comportamento
- `docs`: documentação
- `test`: testes
- `chore`: manutenção, dependências, configurações
- `ci`: pipelines e GitHub Actions

`feat`, `fix`, `perf`, `refactor` e `docs` aparecem no changelog. `test`, `chore` e `ci` ficam de fora. Commit sem prefixo também não aparece, então vale lembrar dele.

### Escopo

O escopo é opcional, mas ajuda a saber onde a mudança aconteceu. Os que mais usamos:

- `interpreter`: Lexer, Parser, Evaluator e analisador estático
- `editor`: Monaco, realce de sintaxe, autocomplete e snippets
- `main`: processo principal do Electron (janela, IPC, arquivos)
- `debug`: fluxo de debug
- `ui`: componentes e painéis da interface

### Escrevendo a descrição

Escreva no imperativo ("corrige", "adiciona"), com letra minúscula e sem ponto final. Tente caber em uns 72 caracteres. Se precisar explicar mais, use o corpo do commit.

### Quebrou compatibilidade?

Se a mudança quebra algo que já funcionava (por exemplo, renomear uma função nativa do VisuAlg), avise de um destes jeitos:

- coloque um `!` depois do tipo: `feat(interpreter)!: renomeia funções nativas`
- ou adicione um rodapé `BREAKING CHANGE:` no corpo do commit

Isso gera uma seção própria no changelog. O texto dela vem do rodapé; se não tiver, usamos a descrição do commit.

```
feat(interpreter)!: renomeia funções nativas

BREAKING CHANGE: sqrt renomeada para raizq e numcarac para numpcarac
```

### Exemplos

```
feat(interpreter): implementa comando aleatorio
fix(editor): adiciona keywords ausentes no realce
fix(main): evita crash no macOS quando build/icon.png não está no pacote
refactor: remove código morto do Evaluator
docs: atualiza seção de contribuição
chore: atualiza dependências
```

## Como seu PR entra na main

Fazemos **squash merge**: todos os commits do PR viram um só na `main`, e a mensagem desse commit é o título do PR. É ele que aparece no changelog.

Na prática, isso quer dizer duas coisas:

- Dê ao PR um título no padrão acima, por exemplo `fix(main): corrige titulo do app`. Se faltar algo, a gente ajusta na hora do merge.
- Pode commitar do jeito que preferir na sua branch, com commits pequenos, "wip", correções da revisão. Esses commits não precisam seguir o padrão e não vão poluir o changelog.

## Mexendo no interpretador

Algumas mudanças pedem atualizações em mais de um lugar:

- Função nativa nova: `NATIVE_FNS` em `Evaluator.ts`, e também `builtins` (Monarch) e `BUILTIN_SIGNATURES` em `Editor.tsx`.
- Keyword nova: `keywords` (Monarch) e `KEYWORDS` (autocomplete), ambos em `Editor.tsx`.
