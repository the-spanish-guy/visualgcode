# Changelog

## [2.0.0] - 2026-04-05

### Correções
- **editor**: Adiciona keywords ausentes no realce e remove funções inexistentes
- **interpreter**: Comparação de strings passa a ser case-insensitive
- **interpreter**: Corrige StaticAnalyzer para WriteArg
- **interpreter**: Corrige log e logn invertidos
- Corrige isNaN(var) para Number.isNaN(var) e roda o lint
- Corrige escreval("") nao printava a quebra de linha
- Corrige cor que mostrava a linha onde tinha um erro/warning
- Corrige autocomplete de variavel
- Corrige snippet escreva/escreval e adiciona mais snippets


### Novas Funcionalidades
- **interpretador**: Implementa comando debug <expr>
- **editor**: Adiciona aleatorio e fimrepita ao realce e autocomplete
- **interpreter**: Implementa comando aleatorio
- **interpreter**: Adiciona sintaxe repita...fimrepita e adiciona snippet
- **interpreter**: Adiciona formatação de saída escreva(x:N) e escreva(x:N:M)
- **interpreter**: Adiciona funções nativas ausentes e refatora callNative
- Muda o ícone na logotipo
- Muda o ícone de estrela para o do github
- Permite que seja possível redimensionar o terminal


### Refatoração
- Tipos e remoção de código morto


## [1.0.5] - 2026-03-26

### Novas Funcionalidades
- Adiciona tela de boas-vindas
- Adiciona Gruvbox Dark/Light tema
- Renomeando dark/light para Abyss Void e Abyss Dawn


## [1.0.4] - 2026-03-21

### Documentação
- Atualizando a documentação


## [1.0.3] - 2026-03-21

### Correções
- Corrige manualChunks para função (Vite 8)
- Ajusta drag-n-drop no mac e traffic-light-buttons, ajusta também o tema Mist


### Documentação
- Adiciona seção de criação de release ao README
- Adiciona CHANGELOG.md gerado automaticamente via git-cliff


### Novas Funcionalidades
- Substitui regex por AST no autocomplete e completa sugestões do Monaco
- Adiciona enum de ipc-channels
- Remove hook n usado e atualiza os types
- Mostra o arquivo que foi salvo como na pasta aberta
- Separando os temas
- Adiciona suporte a constantes
- Testes
- Adiciona comandos limpatela e pausa
- **interpretador**: Suporte a passagem por referência com `var` (#35)
- Adiciona novos operadores
- Adicionado suporte a leia com multiplas variaveis: leia(num1, num2, ...)
- Adicionado suporte a interrompa(break de loop)
- Adicionado suporte a escolha/caso/outrocaso/fimescolha
- Adiiconado suporte a vetor 2D
- Adiiconado suporte a vetor 1D
- Adiciona aba problemas


### Refatoração
- Refatora toda a seção de temas e adiciona novas opções de temas
- Completa migração do App.tsx para stores Zustand


## [1.0.2] - 2026-02-24

### Correções
- **interpretador**: Separar parâmetros de variáveis locais em Procedimento e Função


### Novas Funcionalidades
- Adicionado tema light
- Adicionado timer para execucao com delay
- Adicionado pilha de chamada, ativo durante o debug mode
- Adicionado atalhos para zoom


## [1.0.0] - 2026-02-18

### Correções
- Altera a cor do editorHover quando um erro acontece e passa o mouse por cima
- Adiciona uma explicação amigavel quando um erro acontecer
- Adicionado aba de rastreamento pra ver o lifecycle de cada varivael


### Documentação
- Assets
- Assets
- Adicionado icone no build e no readme
- Adicionado readme


### Novas Funcionalidades
- Melhoria nos highlights das variaveis em modo debug
- Ajustes no IO com o usuario
- Rename css files
- Adicionado painel de variaveis disponivel apenas no modo debug
- Adicionado monaco-editor @monaco-editor/react e iniciado config inicial
- Adicionado toolbar
- Formatando os tokens e devolvendo uma AST(eu espero)
- Adicionado ast typos
- Adicionado arquivo de teste


### refact
- Sugere as variaveis ja declaradas no escopo var
- Melhorado a func que verifica se teve alteracoes
- Move files to renderer folder


### refat
- Remove o estilo padrão da barra de menu do electron
- Movendo editor.ts pra fora da pasta de componentes


