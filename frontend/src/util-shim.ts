/**
 * Simple shim for the Node.js 'util' module to resolve Vite externalization errors.
 */
export const inspect = (obj: any) => {
    try {
        return JSON.stringify(obj, null, 2);
    } catch (e) {
        return String(obj);
    }
};

export const debuglog = () => () => {};

export const deprecate = <T extends Function>(fn: T): T => fn as T;

export const inherits = (ctor: any, superCtor: any) => {
    if (superCtor) {
        ctor.super_ = superCtor;
        ctor.prototype = Object.create(superCtor.prototype, {
            constructor: {
                value: ctor,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
    }
};

export const types = {
    isAnyArrayBuffer: (obj: any) => obj instanceof ArrayBuffer,
    isUint8Array: (obj: any) => obj instanceof Uint8Array,
};

export default {
    inspect,
    debuglog,
    deprecate,
    inherits,
    types
};
