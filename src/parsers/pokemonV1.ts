import {encodeBits, encodeBqV1, findSpecialSigns, minify, prefixLen} from "../utils";

export function pokemonV1(wordlist: Array<string>): string {
    const specialLetters = findSpecialSigns(wordlist)

    const buildBits = () => {
        const chunks = [];
        let prev = "";
        wordlist.forEach((w) => {
            const prefix = Math.min(prefixLen(prev, w), 4);
            if (prev) {
                chunks.push(encodeBits(27 + prefix, 5));
            }

            [...w.slice(prefix)].map(c => {
                if ("a" <= c && c <= "z") {
                    chunks.push(encodeBits(c.charCodeAt(0) - "a".charCodeAt(0) + 1, 5));
                } else {
                    chunks.push([ 0, 0, 0, 0, 0 ] );
                    chunks.push(encodeBits(specialLetters.indexOf(c), 3));
                }
            });

            prev = w;
        });

        chunks.push(encodeBits(27, 5));

        return encodeBqV1(chunks, n => (n >= 5 ? [0,0,0,0,0] : null));
    };

    const encoded = buildBits();
    let js = ` s = <ENCODED>;
  w = ""; // current word
  b = 1; // bits
  v = 5; // bit shift count, 5=normal, 3=specials
  for (i = 0; s[i]; ++i)
      for (
          c = s.charCodeAt(i),
          b = b << (c>>7 ? 10 : 7) | c & 1023
      ;
          b>>v // can we shift at least v bits?
      ;
          // d is the current unit (and some more)
          <FROM>v - 5 ?
              // specials
              w += "<SPECIAL_LETTERS>"[v = 5, d & 7]
          :d ?<TO>
                  d < 27 ?
                      // alphabets
                      w += String.fromCharCode(96 + d)
                  :
                      // newlines and delta encoding
                      w = w.substr(console.log(w), d - 27)
              <FROM>:
                  // switch to specials (for once)
                  v = 3<TO>
      )
          d = b & 31, // will have some garbages when v < 5
          b >>= v // really shift them out
  `;

    js = minify(js);
    // replace it here because first replace would fuck encoded / special letters
    js = js.replace("<ENCODED>", encoded);

    if (specialLetters === '') {
        js = js.replace(/<FROM>.*?<TO>/g, '');
    } else {
        js = js.replace("<SPECIAL_LETTERS>", specialLetters);
    }
    return js;
}