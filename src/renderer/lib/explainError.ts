/**
 * Recebe uma mensagem de erro formatado
 * Retorna uma explicação amigável para o usuário.
 * Retorna null se a mensagem não estiver mapeada
 *
 * @param {string} message mensagem de erro
 * @returns {string|null} explicação amigável ou null
 */
export function explainError(message: string): string | null {
  // Erros do Lexicos
  if (/String não fechada/.test(message))
    return 'Você abriu aspas " mas esqueceu de fechá-las na mesma linha.';

  const unexpectedChar = message.match(/Caractere inesperado '(.+?)'/);
  if (unexpectedChar)
    return `O caractere '${unexpectedChar[1]}' não é válido no VisuAlg. Verifique se não há um símbolo digitado por engano.`;

  // Erros de execução
  const undeclaredVar = message.match(/Variável '(.+?)' não declarada/);
  if (undeclaredVar)
    return `A variável '${undeclaredVar[1]}' está sendo usada mas não foi declarada na seção var.`;

  if (/Divisão inteira por zero/.test(message))
    return "Não é possível usar div com zero no divisor. Verifique o valor da variável antes de dividir.";

  if (/Módulo por zero/.test(message))
    return "Não é possível usar mod com zero no divisor. Verifique o valor da variável antes de usar mod.";

  if (/Divisão por zero/.test(message))
    return "Não é possível dividir um número por zero. Verifique o valor da variável antes de dividir.";

  const invalidInt = message.match(/Valor inválido para inteiro: '(.+?)'/);
  if (invalidInt)
    return `'${invalidInt[1]}' não é um número inteiro válido. Certifique-se de digitar apenas dígitos.`;

  const invalidReal = message.match(/Valor inválido para real: '(.+?)'/);
  if (invalidReal)
    return `'${invalidReal[1]}' não é um número real válido. Use ponto ou vírgula como separador decimal.`;

  const wrongArgs = message.match(/Esperado (\d+) argumento\(s\), recebido (\d+)/);
  if (wrongArgs)
    return `A função ou procedimento espera ${wrongArgs[1]} argumento(s) mas recebeu ${wrongArgs[2]}.`;

  const missingFunc = message.match(/Função '(.+?)' não encontrada/);
  if (missingFunc)
    return `A função '${missingFunc[1]}' não existe. Verifique o nome ou se ela está declarada corretamente.`;

  const missingProc = message.match(/Procedimento '(.+?)' não encontrado/);
  if (missingProc)
    return `O procedimento '${missingProc[1]}' não existe. Verifique o nome ou se ele está declarado corretamente.`;

  const noReturn = message.match(/Função '(.+?)' não retornou valor/);
  if (noReturn)
    return `A função '${noReturn[1]}' foi chamada mas não possui retorne em todos os caminhos de execução.`;

  if (/Condição do 'se' deve ser lógica/.test(message))
    return "A condição do se deve resultar em verdadeiro ou falso, não em um número ou texto.";

  // Erros de sintaxe
  const expectedToken = message.match(/Esperado '(.+?)'/);
  if (expectedToken)
    return `Esperava encontrar '${expectedToken[1]}' neste ponto. Verifique a estrutura do seu algoritmo.`;

  if (/fimalgoritmo/.test(message))
    return "O algoritmo não foi fechado corretamente. Verifique se fimalgoritmo está presente no final.";

  return null;
}
