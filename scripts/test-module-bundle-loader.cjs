#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function writeAscii(buffer, offset, length, value) {
  Buffer.from(value, 'ascii').copy(buffer, offset, 0, length);
}

function tarEntry(name, contents, type = '0') {
  const data = Buffer.from(contents);
  const header = Buffer.alloc(512);
  let shortName = name;
  let prefix = '';
  if (Buffer.byteLength(name) > 100) {
    const split = name.lastIndexOf('/');
    prefix = name.slice(0, split);
    shortName = name.slice(split + 1);
  }
  assert.ok(Buffer.byteLength(shortName) <= 100);
  assert.ok(Buffer.byteLength(prefix) <= 155);
  writeAscii(header, 0, 100, shortName);
  writeAscii(header, 100, 8, '0000644\0');
  writeAscii(header, 108, 8, '0000000\0');
  writeAscii(header, 116, 8, '0000000\0');
  writeAscii(header, 124, 12, data.length.toString(8).padStart(11, '0') + '\0');
  writeAscii(header, 136, 12, '00000000000\0');
  header.fill(0x20, 148, 156);
  header[156] = type.charCodeAt(0);
  writeAscii(header, 257, 6, 'ustar\0');
  writeAscii(header, 263, 2, '00');
  writeAscii(header, 345, 155, prefix);
  const checksum = [...header].reduce((sum, byte) => sum + byte, 0);
  writeAscii(header, 148, 8, checksum.toString(8).padStart(6, '0') + '\0 ');
  const padding = Buffer.alloc((512 - (data.length % 512)) % 512);
  return Buffer.concat([header, data, padding]);
}

const expected = new Map([
  ['Game/Browser/Runtime.olean', Buffer.from('olean-runtime')],
  [
    'Lean/Elab/Tactic/VeryLongModuleDirectoryUsedToExerciseTheUstarPrefixField/Module.ir',
    Buffer.from(Array.from({ length: 1900 }, (_, index) => index % 251)),
  ],
]);
const archive = Buffer.concat([
  // GNU/bsdtar include this root directory marker for `tar -C dir .`.
  tarEntry('./', Buffer.alloc(0), '5'),
  ...[...expected].map(([name, contents]) => tarEntry(name, contents)),
  Buffer.alloc(1024),
]);

const files = new Map();
const directories = new Set(['/lib', '/lib/lean']);
const FS = {
  mkdir(directory) {
    if (directories.has(directory)) throw new Error('exists');
    directories.add(directory);
  },
  open(filePath) {
    return { path: filePath, chunks: [] };
  },
  write(stream, bytes, offset, length) {
    stream.chunks.push(Buffer.from(bytes.subarray(offset, offset + length)));
  },
  close(stream) {
    files.set(stream.path, Buffer.concat(stream.chunks));
  },
};

const progress = [];
const context = vm.createContext({
  Blob,
  DecompressionStream,
  TextDecoder,
  TransformStream,
  URLSearchParams,
  Uint8Array,
  console,
  location: { search: '' },
  navigator: { userAgent: 'module-bundle-test', platform: 'test', maxTouchPoints: 0 },
  performance,
  Module: { FS },
  self: { postMessage: (message) => progress.push(message) },
  fetch: async () => {
    // Fragment at awkward boundaries so headers and file padding span chunks.
    const chunks = [archive.subarray(0, 17), archive.subarray(17, 777), archive.subarray(777)];
    return new Response(new ReadableStream({
      pull(controller) {
        const chunk = chunks.shift();
        if (chunk) controller.enqueue(chunk);
        else controller.close();
      },
    }), { headers: { 'content-length': String(archive.length) } });
  },
});

const workerSource = fs.readFileSync(
  path.resolve(__dirname, '..', 'public', 'lean-worker-persistent.worker.js'),
  'utf8',
);
vm.runInContext(workerSource, context, { filename: 'lean-worker-persistent.worker.js' });
vm.runInContext('moduleReady = true', context);

(async () => {
  const result = await vm.runInContext("loadModuleBundle('/game-modules.tar')", context);
  assert.equal(result.success, true);
  assert.equal(result.files, expected.size);
  for (const [relative, contents] of expected) {
    assert.deepEqual(files.get('/lib/lean/' + relative), contents);
  }
  assert.ok(progress.some((message) => message.type === 'module_bundle_progress'));
  console.log(`module bundle loader test passed (${result.files} files, ${result.expanded} bytes)`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
