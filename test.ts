import { Lexer } from "./interpreter/Lexer";

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

try {
  const tokens = new Lexer(code).tokenize();
  console.log(tokens)
} catch (err) {
  console.error("❌", (err as Error).message);
}