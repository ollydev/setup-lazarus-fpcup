const core = require('@actions/core');
const cache = require('@actions/cache');
const process = require('process');

async function run() {
    try {
        await cache.saveCache([process.env['SAVE_CACHE_DIR']], process.env['SAVE_CACHE_KEY']);
    } catch (error) {
        console.log(error.message);
    }
}

run();
