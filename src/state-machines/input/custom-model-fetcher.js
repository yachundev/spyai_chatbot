
const CustomModelFetcher = async (path) => {
    let arrayBuf = await fetchModel(path);
   return copyArrayBuffer(arrayBuf);
}

const fetchModel = (path) => {
    return fetch(path).then((model) => model.arrayBuffer());
}


const _CustomModelFetcher = CustomModelFetcher;
export { _CustomModelFetcher as CustomModelFetcher };

const copyArrayBuffer = (original) => {
    var arrayBuffer = new ArrayBuffer(original.byteLength);
    new Uint8Array(arrayBuffer).set(new Uint8Array(original));
    return arrayBuffer;
}