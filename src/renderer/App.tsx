import { useState } from "react";
import Editor from "./components/Editor";
import Toolbar from "./components/Toolbar";
import styles from "./styles/app.module.css";

const STARTER_CODE = `algoritmo "Meu Programa"

var
   nome: caractere
   idade: inteiro

inicio
   escreval("=== Bem-vindo ao VisuAlg IDE ===")
   escreval("")
   escreva("Digite seu nome: ")
   leia(nome)
   escreva("Digite sua idade: ")
   leia(idade)
   escreval("")
   escreval("Olá, ", nome, "!")

   se idade >= 18 entao
      escreval("Você é maior de idade.")
   senao
      escreval("Você é menor de idade.")
   fimse

fimalgoritmo
`;
export default function App() {
  const [code, setCode] = useState(STARTER_CODE);
  const [cursorInfo, setCursorInfo] = useState({ line: 1, col: 1 });

  return (
    <div className={styles.root}>
      <Toolbar />

      <Editor value={STARTER_CODE} onChange={setCode} onCursorChange={setCursorInfo} />
    </div>
  );
}
