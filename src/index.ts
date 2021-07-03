import {pokemonV1} from "./parsers/pokemonV1";
import {pokemonV2} from "./parsers/pokemonV2";

export default function parseCode(words: string): {v1,
v2} {
  const wordlist = words.split(`\n`);
  return {
    v1: pokemonV1(wordlist),
    v2: pokemonV2(wordlist)
  }
}
