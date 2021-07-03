import { readFileSync } from 'fs'

interface item {
  v: any;
  w: any;
  widen: any;
}


export function readLinesFromFile(filePath: string, separator: string = '\n'): Array<string> {
  return readFileSync(filePath).toString().split(separator)
}

export function createTestDictionary(length: number, minWordLength: number,  separator: string = '\n'): string {
  let temp = ``
  for(let i = 0; i < length; i++) {
    // @ts-ignore
    const stringLength = !!( Math.random() + minWordLength ) * 4
    for(let j = minWordLength; j < stringLength; j++) {
      const number = (Math.random() * ('a'.charCodeAt(0) - 'z'.charCodeAt(0))) + 'a'.charCodeAt(0)
      temp += String.fromCharCode(number)
    }

    if (i + 1 !== length) {
      temp += separator
    }
  }

  return temp
}

export function assert(condition: boolean, message: string): boolean {
  if (!condition) {
    // console.log(message || "Assertion failed");
    return false;
  }

  return true;
}

export function findSpecialSigns(wordlist: Array<string>): string {
  const tempSet = new Set()
  wordlist.forEach(w => {
    const special = w.replace(/[a-z]/g, '');
    [...special].forEach(e => {
      tempSet.add(e)
    })
  });

  return [...tempSet].join(``)
}

export function prefixLen(a: string, b: string): number {
  const maxLength = Math.min(a.length, b.length);
  let temp = 0;
  for (let i = 0; i < maxLength; i++) {
    if (a[i] !== b[i]) {
      temp = i;
      break;
    }
  }

  return temp || 0;
}

export function encodeBits(v: number, nbits: number): Array<number> {
  const val = assert(v >> (nbits + 1) === 0, `(${v}, ${nbits + 1})`);
  return val && [...Array(nbits).keys()].reverse().map((i) => (v >> i) & 1);
}

export function decodeBits(bits: any): number {
  let v = 0;
  bits.forEach(b => {
    const c = parseInt(b);
    const val = assert(c === 0 || c === 1, 'c === 0 || c === 1 '+ b);
    val && (v = (v << 1) | parseInt(b));
  })

  return v;
}

export function validByte(v: number): boolean {
  return [13, 36, 92, 96].indexOf(v) < 0;
}

export function quotes(str: string): string {
  if (str.includes("\n")) {
    return "`" + str.replace(/`/g, "\\`") + "`";
  } else {
    return str.split('"').length >= str.split("'").length
      ? `'${str.replace(/'/g, "\\'")}'`
      : `"${str.replace(/"/g, '\\"')}"`;
  }
}

export function minify(s: string): string {
  return s.replace(/\s|\/\/[^\n]*(?:\n|$)/g, "");
}

export function encodeBqV1(
  chunks: Array<string>,
  extra_chunk_func: any,
  nfullbits = 10
) {
  const widen_offsets = new Set();
  const tryOnce = (): Array<item> => {
    const vv = [];
    let holesz = 0;
    let k = 0;

    while (true) {
      let chunk = null;

      try {
        if (k === chunks.length) throw new Error('asd');
        chunk = chunks[k];
        k += 1;
      } catch (err) {
        if (holesz > 0) {
          chunk = extra_chunk_func(holesz);
        }

        if (!chunk) {
          break;
        }
      }
      let bits = decodeBits(chunk);
      let nbits = chunk.length;

      while (holesz < nbits) {
        const widen = widen_offsets.has(vv.length);
        vv.push({
          v: 0,
          n: 0,
          widen
        });
        holesz += widen ? nfullbits : 7;
      }

      holesz -= nbits;
      let i = vv.length - 1;

      while (true) {
        assert(i >= 0, "i >= 0 " + i);
        if(i >= 0) {

        let {v, n, widen } = vv[i];
        const nn = widen ? nfullbits : 7;
        if (n < nn) {
          const m = Math.min(nn - n, nbits);
          v |= (bits & ((1 << m) - 1)) << n;
          n += m;

          if (n === nn && !(widen || validByte(v))) {
            const val = assert(!widen, 'widen ' + widen);
            val && widen_offsets.add(i);
            return null;
          }

          vv[i] = { v, n, widen };
          bits >>= m;
          nbits -= m;

          if (nbits === 0) {
            break;
          }
        }

        i -= 1;
        }

      }
    }
    return vv;
  };

  const total_bytes = chunks.reduce((v, a) => v + (a.length || 0), 0); // 7
  let vv = null;

  while (!(vv = tryOnce())) {}

  const ret = [];
  console.log(vv.length)
  vv.forEach((val) => {
    // @ts-ignore
    const { v, n, widen } = val;
    if (widen) {
      ret.push(String.fromCharCode(v | (1 << nfullbits)));
    } else {
      let w = v | (0b1111111 >> n << n)
      if (!validByte(w)) {
        const f = assert(validByte(v), "validByte  " + v);
        f && (w = v);
      }
      ret.push(String.fromCharCode(w));
    }
  });
  return "`" + ret.join(``) + "`";
}

export function ord (c:string):number {
  return c.charCodeAt(0)
}

export function range (length: number):Array<number> {
  return Object.keys([...new Array(length)]).map(Number)
}

export const INVALID_OFFSETS_V2 = {13: 0x80, 36: 0x100, 92: 0x180, 96: 0x200}

export function encode_bq_v2(buf) {
  const ret = []
  let offset = 0
  buf.forEach(v => {
    if(assert((0 <= v) && (v < 128), '')) {
      if (offset) {
        ret.push(offset + v)
        offset = 0
      } else if (validByte(v)) {
        ret.push(v)
      } else {
        offset = INVALID_OFFSETS_V2[v]
      }
    }
  })
  assert( offset == 0, 'suboptimal encoding, put more padding bits to solve this issue')
  return ret.map(e=> String.fromCodePoint(e)).join('')
}