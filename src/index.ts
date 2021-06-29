import {pokemonV1} from "./parsers/pokemonV1";

export default function parseCode(words: string): string {
  const wordlist = words.split(`\n`);
  return pokemonV1(wordlist)
}

let a = parseCode(`asd`)
console.log(a)