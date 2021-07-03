import {charwise_model_v1, context_model_v1, MODELMAXCOUNT, MODELPREC} from "../models";
import {encode_bq_v2, minify, ord, prefixLen, quotes, range} from "../utils";
import {RANS_DECODER, RANS_ENCODER} from "../rANS";

export function pokemonV2(wordlist: Array<string>): string {
    let MAXPREFIXLEN = 4

    const prefix_code = wordlist => {
        let s = ''
        let prev = ''
        wordlist.forEach(w => {
            const prefixlen = Math.min(prefixLen(prev, w), MAXPREFIXLEN)
            s += String.fromCharCode(prefixlen) + w.slice(prefixlen)
            prev = w
        })

        return s.slice(1) + '\0'
    }

    const token_to_bit = (c) => {
        if (('\0' <= c) && (c <= '\x1f')) {
            return {
                token: ord(c),
                special: ''
            }
        } else if (('a' <= c) && (c <= 'z')) {
            return {
                token: ord(c) - ord('a') + MAXPREFIXLEN + 2,
                special: ''
            }
        } else {
            return {
                token: MAXPREFIXLEN + 1,
                special: c
            }
        }

    }

    const CODEBITS = 5
    const model = new context_model_v1(charwise_model_v1, CODEBITS, 1)

    const reset_context = () => {
        model.reset()
    }

    const update_context = (words, k, c) => {
        model.context = c
    }

    const compress = words => {
        reset_context()
        const enc = new RANS_ENCODER()
        let bit
        words.forEach((word, index) => {
            range(CODEBITS).reverse().forEach(i => {
                bit = word >> i & 1
                enc.put_bit(bit, model.pred, MODELPREC)
                model.update(bit)
            })
            update_context(words, index, word)
        })

        return enc.done()

    }

    const decompress = (st, buf, nwords) => {
        reset_context()
        const dec = new RANS_DECODER(st, buf)
        const words = []

        range(nwords).forEach(k => {
            let c = 0
            range(CODEBITS - 1).reverse().forEach(i => {
                const bit = dec.get_bit(model.pred, MODELPREC)
                // @ts-ignore
                c = (c << 1) | bit
                model.update(bit)
            })

            words.push(c)
            update_context(words, k, c)
        })
        return words
    }

    const tokens = []
    let specials = ''

    prefix_code(wordlist).split('').forEach(c => {
        const {token, special} = token_to_bit(c)
        tokens.push(token)
        specials += special
    })

    const { st, buffer } = compress(tokens)
    console.log(st, buffer.join(`,`))
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
        i < <ENCODEDLEN+1>
        ;
        // update context and use it as a decoded value
        c = v - ${1 << (CODEBITS)},

            c > <MAXPREFIXLEN> ?
                w += c - <MAXPREFIXLEN+1> ?
                    // alphabets
                    String.fromCharCode(<95-MAXPREFIXLEN> + c)
                    :
                    // specials (output in the prespecified order)
                    <SPECIALS>[j++]
                :
                // newlines and delta encoding
                w = w.slice(console.log(w), c)
    )
        for (
            v = 1;
            v < <2^CODEBITS>;

            // update contexts and weights with b and d (which is now the bit context)
            p[d] +=
                ((b << <MODELPREC>) - p[d]) *
                // to be compatible with int ops
                (M / (m[d] += 2 * (m[d] < <2*MODELMAXCOUNT>)) | 0)
                >> <MODELPREC>, // >> is fine, we have already verified during encoding

                v = v * 2 + b
        )
            for (
                // get the current prediction, and store the model index to d
                q = p[d = c << <CODEBITS> | v] * 2 + 1,

                    // decode the bit b
                    b = t % M < q,
                    t = (b ? q : M-q) * (t >> <MODELPREC+1>) + t % M - !b * q
                ;
                // renormalize if needed
                t < M << <20-MODELPREC>
                ;
                r = r ? y & 127 : -1
            )
                y = ~r ? r : \`<ENCODED>\`.charCodeAt(i++),
                    // if wide, consult the lookup table.
                    // if narrow, the lookup table evaluates to undefined so y is used instead.
                    t = t << 7 | ([,13,36,92,96][r = y >> 7] || y)
    `
    js = minify(js)
    js = js.replace(/<SPACE>/g, ' ')
    js = js.replace('<MAXPREFIXLEN>', ''+MAXPREFIXLEN)
    js = js.replace('<MAXPREFIXLEN+1>', ''+(MAXPREFIXLEN + 1))
    js = js.replace('<95-MAXPREFIXLEN>', ''+(95 - MAXPREFIXLEN))
    // js = js.replace('<INITIALSTATE>', ''+st)
    js = js.replace('<ENCODEDLEN+1>', ''+(encoded.length + 1))
    js = js.replace('<CODEBITS>', ''+CODEBITS)
    js = js.replace('<2^CODEBITS>', ''+(1 << CODEBITS))
    // js = js.replace(/<2\^(CODEBITS\*2)>/g, ''+(1 << (CODEBITS * 2)))
    js = js.replace(/<MODELPREC>/g, ''+(MODELPREC))
    js = js.replace('<MODELPREC+1>', ''+(MODELPREC + 1))
    js = js.replace('<20-MODELPREC>', ''+(20 - MODELPREC))
    js = js.replace('<MODELMAXCOUNT>', ''+(MODELMAXCOUNT))
    js = js.replace('<2*MODELMAXCOUNT>', ''+(2*MODELMAXCOUNT))
    js = js.replace('<ENCODED>', encoded)
    js = js.replace('<SPECIALS>', quotes(specials))

    return js
}