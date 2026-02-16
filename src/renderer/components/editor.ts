import type { Monaco } from "@monaco-editor/react";
import type { IRange, languages } from "monaco-editor";

export const snippets = (monaco: Monaco, range: IRange): languages.CompletionItem[] => [
  {
    label: "algoritmo",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText:
      'algoritmo "${1:NomeDoPrograma}"\n\nvar\n   ${2:variavel}: ${3|inteiro,real,caractere,logico|}\n\ninicio\n   ${4}\n\nfimalgoritmo',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: "Estrutura completa do algoritmo",
    range,
  },
  {
    label: "escreva",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: "escreva(${1:variavel})",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: "Comando de saída",
    range,
  },
  {
    label: "se...entao...fimse",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: "se ${1:condicao} entao\n   ${2}\nfimse",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: "Estrutura condicional",
    range,
  },
  {
    label: "se...senao...fimse",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: "se ${1:condicao} entao\n   ${2}\nsenao\n   ${3}\nfimse",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: "Condicional com alternativa",
    range,
  },
  {
    label: "para...fimpara",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: "para ${1:i} de ${2:1} ate ${3:10} faca\n   ${4}\nfimpara",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: "Laço para",
    range,
  },
  {
    label: "enquanto...fimenquanto",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: "enquanto ${1:condicao} faca\n   ${2}\nfimenquanto",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: "Laço enquanto",
    range,
  },
  {
    label: "repita...ate",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: "repita\n   ${1}\nate ${2:condicao}",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: "Laço repita",
    range,
  },
];
