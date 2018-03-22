const crypto = require('crypto');
const http = require('http');
const url = require('url');
const zlib = require('zlib');
const Wreck = require('wreck');

const generatePayload = (size, gzip) => gzip ?
    zlib.gzipSync(crypto.randomFillSync(Buffer.alloc(size))) :
    crypto.randomFillSync(Buffer.alloc(size));

const getUrl = () => new Promise(resolve => {
    const server = http.createServer((request, response) => {
        let {query: {size, gzip}} = url.parse(request.url, true);
        size = parseInt(size, 10);
        gzip = gzip === 'true';
        response.setHeader('Content-Encoding', gzip ? 'gzip' : 'identity');
        response.end(generatePayload(size, gzip));
    })
    .listen(0)
    .on('listening', () => {
        resolve({server, url: `http://127.0.0.1:${server.address().port}`});
    });
});

const request = async (serverUrl, size, gunzip) => {
    const url = `${serverUrl}?size=${size}&gzip=${gunzip}`;
    try {
        const {payload} = await Wreck.get(url, {gunzip});
        console.log(`Received a ${gunzip ? 'gzipped ' : ''}payload of ${payload.length} bytes`);
    } catch (error) {
        console.log(`Error requesting a ${gunzip ? 'gzipped ' : ''}payload of ${size} bytes:`)
        console.error(error.stack);
    }
};

const run = async () => {
    const {server, url} = await getUrl();
    console.log(`Server started ${url}`);
    await request(url, 1e4, false);
    await request(url, 1e4, true);
    await request(url, 1e5, false);
    await request(url, 1e5, true);
    server.close();
}

run().catch(e => console.error(e));
