import {assert} from "./utils";

const RANS_L = 1 << (28 - 7)

export class RANS_ENCODER {

    st: number
    buffer: []
    reqs: []

    constructor() {
        this.st = RANS_L
        this.buffer = []
        this.reqs = []
    }


    put(start, freq, scale) {
        // @ts-ignore
        return this.reqs.push({start, freq, scale})
    }

    put_bit(bit, pred, scale) {
        pred = pred * 2 + 1
        scale += 1
        if (bit) {
            this.put(0, pred, scale)
        } else{
            this.put(pred, (1 << scale) - pred, scale)
        }
    }

    put_back(start, freq, scale) {
        const value = assert( freq > 0 , 'freq > 0')
        if (value) {
            let st = this.st
            let stMax = (RANS_L >> scale << 7) * freq
            while (st >= stMax) {
                // @ts-ignore
                this.buffer.push(st & 0x7f)
                st >>= 7
                this.st = (~~(st / freq) << scale) + (st % freq) + start
            }
        }
    }

    done() {
        this.reqs.reverse().map(({start, freq, scale}) => {
            this.put_back(start, freq, scale)

        })

        const buffer = this.buffer
        const st = this.st
        this.buffer = this.st = null

        return {st: st, buffer: buffer.reverse()}

    }
}

export class RANS_DECODER {
    st: number
    buffer: []
    i: number

    constructor(st, buffer ){
        this.st = st
        this.buffer = buffer
        this.i = 0
    }

    peek(scale) {
        return this.st & ((1 << scale) - 1)
    }

    advance(start, freq, scale) {
        let st = this.st
        st = freq * (st >> scale) + (st & ((1 << scale) - 1)) - start
        while (st < RANS_L){
            assert(this.buffer[this.i] < 0x80, 'this.buffer[this.i] < 0x80')
            st = (st << 7) | this.buffer[this.i]
            this.i++
        }

        this.st = st
    }

    get_bit(pred, scale) {
        const temp = pred * 2 + 1
        scale += 1
        const bit = this.peek(scale) < temp
        if (bit) {
            this.advance(0, temp, scale)
        } else {
            this.advance(temp, (1 << scale) - temp, scale)
        }

        return bit
    }
}