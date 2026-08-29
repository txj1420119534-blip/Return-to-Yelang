const VERSION_ONE_SIZE = 21;
const DATA_CODEWORDS = 19;
const ECC_CODEWORDS = 7;

function multiply(x: number, y: number) {
  let product = 0;
  for (let i = 7; i >= 0; i -= 1) {
    product = (product << 1) ^ ((product >>> 7) * 0x11d);
    product ^= ((y >>> i) & 1) * x;
  }
  return product;
}

function reedSolomonDivisor(degree: number) {
  const result = new Uint8Array(degree);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = multiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = multiply(root, 2);
  }
  return result;
}

function reedSolomonRemainder(data: Uint8Array, divisor: Uint8Array) {
  const result = new Uint8Array(divisor.length);
  for (const byte of data) {
    const factor = byte ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < result.length; i += 1) result[i] ^= multiply(divisor[i], factor);
  }
  return result;
}

function appendBits(bits: number[], value: number, length: number) {
  for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
}

function makeCodewords(value: string) {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length > 17) throw new Error('Version 1-L QR payload must be 17 bytes or fewer');
  const bits: number[] = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 8);
  for (const byte of bytes) appendBits(bits, byte, 8);
  appendBits(bits, 0, Math.min(4, DATA_CODEWORDS * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = new Uint8Array(DATA_CODEWORDS);
  for (let i = 0; i < bits.length; i += 1) data[i >>> 3] |= bits[i] << (7 - (i & 7));
  for (let i = Math.ceil(bits.length / 8), pad = 0; i < data.length; i += 1, pad += 1) data[i] = pad % 2 === 0 ? 0xec : 0x11;
  const remainder = reedSolomonRemainder(data, reedSolomonDivisor(ECC_CODEWORDS));
  return new Uint8Array([...data, ...remainder]);
}

export function createQrMatrix(value: string) {
  const size = VERSION_ONE_SIZE;
  const modules = Array.from({ length: size }, () => Array.from({ length: size }, () => false));
  const functions = Array.from({ length: size }, () => Array.from({ length: size }, () => false));

  function setFunction(x: number, y: number, dark: boolean) {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    modules[y][x] = dark;
    functions[y][x] = true;
  }

  function drawFinder(centerX: number, centerY: number) {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        setFunction(centerX + dx, centerY + dy, distance !== 2 && distance !== 4);
      }
    }
  }

  for (let i = 0; i < size; i += 1) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }
  drawFinder(3, 3);
  drawFinder(size - 4, 3);
  drawFinder(3, size - 4);

  const errorCorrectionLevelL = 1;
  const mask = 0;
  const formatData = (errorCorrectionLevelL << 3) | mask;
  let remainder = formatData;
  for (let i = 0; i < 10; i += 1) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  const formatBits = ((formatData << 10) | remainder) ^ 0x5412;
  const formatBit = (index: number) => ((formatBits >>> index) & 1) !== 0;
  for (let i = 0; i <= 5; i += 1) setFunction(8, i, formatBit(i));
  setFunction(8, 7, formatBit(6));
  setFunction(8, 8, formatBit(7));
  setFunction(7, 8, formatBit(8));
  for (let i = 9; i < 15; i += 1) setFunction(14 - i, 8, formatBit(i));
  for (let i = 0; i < 8; i += 1) setFunction(size - 1 - i, 8, formatBit(i));
  for (let i = 8; i < 15; i += 1) setFunction(8, size - 15 + i, formatBit(i));
  setFunction(8, size - 8, true);

  const codewords = makeCodewords(value);
  let bitIndex = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let vertical = 0; vertical < size; vertical += 1) {
      const y = upward ? size - 1 - vertical : vertical;
      for (let column = 0; column < 2; column += 1) {
        const x = right - column;
        if (functions[y][x]) continue;
        const bit = bitIndex < codewords.length * 8 ? ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0 : false;
        const masked = bit !== ((x + y) % 2 === 0);
        modules[y][x] = masked;
        bitIndex += 1;
      }
    }
    upward = !upward;
  }
  return modules;
}
