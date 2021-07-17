import {pokemonV1} from "./parsers/pokemonV1";
import {pokemonV2} from "./parsers/pokemonV2";
import {byteSize} from "./utils";

export default function parseCode(words: string, splitFunc = a => a.split(`\n`)): {v1, v2} {
  const wordlist = splitFunc(words);
  const pV1 = pokemonV1(wordlist)
  const pV2 = pokemonV2(wordlist)
  return {
    v1: {
      code: pV1,
      initialSize: byteSize(words),
      bytes: byteSize(pV1)
    },
    v2: {
      code: pV2,
      initialSize: byteSize(words),
      bytes: byteSize(pV2)
    },
  }
}


console.log(parseCode(`asd
fsda
fdsa
sd
asd`).v2.code)










