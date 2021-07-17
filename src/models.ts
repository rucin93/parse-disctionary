import { range } from "./utils";

export const MODELPREC = 16
export const MODELMAXCOUNT = 63

export const DIVCOUNT = range(MODELMAXCOUNT+1).map(count => ~~((2 << MODELPREC) / (2 * count + 1)))

export class bitwise_model_v1 {
    pred: number
    count: number

    constructor() {
        this.pred = 1 << (MODELPREC - 1)
        this.count = 0
    }

    reset() {
        this.pred = 1 << (MODELPREC - 1)
        this.count = 0
    }

    update(bit) {
        if (this.count < MODELMAXCOUNT) {
            this.count += 1
        }
        const delta = ((bit << MODELPREC) - this.pred) * DIVCOUNT[this.count]
        if ((-0x80000000 <= delta) && (delta <= 0x7fffffff)) {
            this.pred += (delta) >> MODELPREC
        }
    }
}
export class charwise_model_v1 {
    models: bitwise_model_v1[]
    bit_context: number

    constructor(charbits) {
        this.models = range(1 << charbits).map(i => new bitwise_model_v1())
        this.bit_context = 1
    }

    reset () {
        this.models.forEach(model => model.reset())
        this.bit_context = 1
    }

    get pred() {
        return this.models[this.bit_context].pred
    }

    update(bit) {
        this.models[this.bit_context].update(bit)
        this.bit_context = (this.bit_context << 1) | bit
        if (this.bit_context >= this.models.length) {
            this.bit_context = 1
        }
    }
}

export class context_model_v1 {
    models: any[]
    context: number

    constructor(model_class, charbits, order) {
        this.models = range(1 << (charbits * order) + 1).map(() => new model_class(charbits))
        this.context = 0
    }

    reset() {
        this.models.forEach(model => model.reset())
        this.context = 0
    }

    get pred() {
        return this.models[this.context].pred
    }

    update(bit) {
        (0 <= this.context) && (this.context < this.models.length) && this.models[this.context].update(bit)
    }
}

