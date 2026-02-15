import { Evaluator } from "./interpreter/Evaluator";
import { Lexer } from "./interpreter/Lexer";
import { Parser } from "./interpreter/Parser";

const code = `
algoritmo "Meu Primeiro Programa"

var
   valorUm, valorDois, resultadoSoma,resultadoSubtracao: real

inicio
   escreval("Digite valor 1: ")
   leia(valorUm)
   escreval("Digite valor 2: ")
   leia(valorDois)
   resultadoSoma <- valorUm + valorDois
   escreval("Resultado soma: ", resultadoSoma)
   resultadoSubtracao <- valorUm - valorDois
   escreval("Resultado subtracao: ", resultadoSubtracao)

   se resultadoSoma > 10 entao
      escreval("Soma maior que 10!")
   senao
      escreval("Soma menor ou igual a 10.")
   fimse

fimalgoritmo
`;

const code2 = `
algoritmo "ExemploPara"
var
    i: inteiro
inicio
    para i de 1 ate 5 faca
        escreval("Número: ", i)
    fimpara

   escreval(a)
fimalgoritmo   
`

const code3 = `
algoritmo "Meu Primeiro Programa"

var
   valorUm: real
   valorDois: real
   resultadoSoma: real
   resultadoSubtracao: real

inicio

   escreval("Digite valor 1: ")
   leia(valorUm)
   escreval("Digite valor 2: ")
   leia(valorDois)
   resultadoSoma <- valorUm + valorDois
   escreval("Resultado soma: ", resultadoSoma)
   resultadoSubtracao <- valorUm - valorDois
   escreval("Resultado subtracao: ", resultadoSubtracao)

fimalgoritmo
`

const code4 = `
algoritmo "Calcula Fatorial"
var
    num, resultado: inteiro
inicio
    escreva("Digite um número inteiro: ")
    leia(num)
    resultado <- fatorial(num)
    escreva("O fatorial de ", num, " é: ", resultado)

fimalgoritmo

funcao fatorial (v: inteiro): inteiro
var
    resultado: inteiro
inicio
    se v <= 1 entao
        retorne 1
    senao
        retorne v * fatorial(v - 1)
    fimse
fimfuncao   
`

// Simula inputs do usuário em sequência
const inputs = ["12", "10"];
let inputIndex = 0;

try {
  const tokens = new Lexer(code4).tokenize();
  const ast    = new Parser(tokens).parse();
  console.log(ast)

  const evaluator = new Evaluator(
    (text) => process.stdout.write(text),       // onOutput
    ()     => inputs[inputIndex++] ?? "0"       // onInput
  );

  evaluator.run(ast);
} catch (err) {
  console.error("❌", (err as Error).message);
}