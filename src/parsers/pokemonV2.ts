import {MODELMAXCOUNT, MODELPREC} from "../models";
import {encode_bq_v2, minify, prefix_code, quotes, token_to_bit} from "../utils";
import {RANS_DECODER, RANS_ENCODER} from "../rANS";

export function pokemonV2(wordlist: Array<string>): string {
    const MAXPREFIXLEN = 4
    const CODEBITS = 5
    const tokens = []
    let specials = ''

    prefix_code(wordlist, MAXPREFIXLEN).split('').forEach(c => {
        const {token, special} = token_to_bit(c, MAXPREFIXLEN)
        tokens.push(token)
        specials += special
    })

    const { st, buffer } = RANS_ENCODER.compress(tokens, CODEBITS)
    console.log(st, buffer)
    const testDecodedTokens = RANS_DECODER.decompress(st, buffer, tokens.length, CODEBITS)
    if (testDecodedTokens.join(``) === tokens.join(``)) {
        console.log('model is equal')
    }

    const encoded = encode_bq_v2(buffer)
    let js = `
    r = -1; // -1 or next 7 bits to read, used for handling wide "bytes"
    t = ${st}; // rANS state

    M = ${(MODELPREC < 16 ? (2 << MODELPREC) : '2<<' + MODELPREC)};

// initialize model
    A = Array;
    m = A(${1 << (CODEBITS * 2)}).fill(1); // count
    p = A(${1 << (CODEBITS * 2)}).fill(M/4); // predictions

    w = ""; // current word

    for (
        i =   // read position
            j =   // specials position
                c = 0 // context (i.e. previous byte)
        ;
        i < ${encoded.length + 1}
        ;
        // update context and use it as a decoded value
        c = v - ${1 << (CODEBITS)},

            c > ${MAXPREFIXLEN} ?
                w += c - ${MAXPREFIXLEN + 1} ?
                    // alphabets
                    String.fromCharCode(${95 - MAXPREFIXLEN} + c)
                    :
                    // specials (output in the prespecified order)
                    <SPECIALS>[j++]
                :
                // newlines and delta encoding
                w = w.slice(console.log(w), c)
    )
        for (
            v = 1;
            v < ${1 << CODEBITS};

            // update contexts and weights with b and d (which is now the bit context)
            p[d] +=
                ((b << ${MODELPREC}) - p[d]) *
                // to be compatible with int ops
                (M / (m[d] += 2 * (m[d] < ${2 * MODELMAXCOUNT})) | 0)
                >> ${MODELPREC}, // >> is fine, we have already verified during encoding

                v = v * 2 + b
        )
            for (
                // get the current prediction, and store the model index to d
                q = p[d = c << ${CODEBITS} | v] * 2 + 1,

                    // decode the bit b
                    b = t % M < q,
                    t = (b ? q : M-q) * (t >> ${MODELPREC + 1}) + t % M - !b * q
                ;
                // renormalize if needed
                t < M << ${20 - MODELPREC}
                ;
                r = r ? y & 127 : -1
            )
                y = ~r ? r : \`<ENCODED>\`.charCodeAt(i++),
                    // if wide, consult the lookup table.
                    // if narrow, the lookup table evaluates to undefined so y is used instead.
                    t = t << 7 | ([,13,36,92,96][r = y >> 7] || y)
    `
    js = minify(js)
    js = js.replace('<ENCODED>', encoded)
    js = js.replace('<SPECIALS>', quotes(specials))

    return js
}