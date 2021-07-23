// npm run build && git add -A && git commit -m "dev" && git push

const core = require('@actions/core');
const exec = require("@actions/exec");
const tc = require('@actions/tool-cache');
const cache = require('@actions/cache');
const process = require('process');
const path = require('path');
const md5 = require('md5');

const cacheKey = process.platform + '-' + core.getInput('cpu') + '@' + md5(core.getInput('laz-url') + core.getInput('fpc-url'));

async function bash(command_line) {
    await exec.exec('bash', ['-c', command_line.join(' ')]);
}

async function install_fpcup(cpu) {

    var dict = {};

    dict['linux'] = {
      'x86_64': "https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/1.8.2s1/fpclazup-x86_64-linux",
      'aarch64': "https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/1.8.2s1/fpclazup-x86_64-linux"
    }

    dict['win32'] = {
      'i386': "https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/1.8.2s1/fpclazup-i386-win32.exe",
      'x86_64': "https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/1.8.2s1/fpclazup-x86_64-win64.exe"
    }

    dict['darwin'] = {
      'x86_64': "https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/1.8.2s1/fpclazup-x86_64-darwin"
    }
    
    try {
        console.log('Downloading: ', dict[process.platform][cpu]);
    } catch {
        throw new Error('Invalid cpu "' + cpu + '" on platform "' + process.platform + '"');
    }
    
    await tc.downloadTool(dict[process.platform][cpu], 'fpcup');
    await bash(['chmod +x fpcup']);
}

async function restore_lazarus() {

    var key = await cache.restoreCache(['.laz'], cacheKey);
    if (key != null) {
        console.log('Restored lazarus from cache');
    }

    return key != null;
}

async function install_lazarus() {

    console.log('Installing Lazarus');

    await bash(['mkdir -p .laz']);
    await bash(['./fpcup',
                '--fpcURL=' + core.getInput('fpc-url'),
                '--lazURL=' + core.getInput('laz-url'),
                '--installdir=.laz',
                '--only=docker',
                '--noconfirm'
               ]);
}

async function install_cross_compiler(cpu) {
    
    if (cpu =='aarch64') {
        
        console.log('Installing cross compiler: aarch64');

        await tc.extractZip(await tc.downloadTool('https://github.com/LongDirtyAnimAlf/fpcupdeluxe/releases/download/crosslibs_v1.1/CrossLibsLinuxAarch64.zip'), '.laz/');
        await tc.extractZip(await tc.downloadTool('https://github.com/LongDirtyAnimAlf/fpcupdeluxe/releases/download/linuxx64crossbins_v1.0/CrossBinsLinuxAarch64.zip'), '.laz/cross/bin');
        
        await bash(['./fpcup',
                    '--installdir=.laz',
                    '--ostarget=linux',
                    '--cputarget=aarch64',
                    '--only=FPCCleanOnly,FPCBuildOnly',
                    '--crossbindir=.laz/cross/bin',
                    '--crosslibdir=.laz/cross/lib/aarch64-linux',
                    '--noconfirm',
                    '--verbose'
                   ]);        
    }
}

async function run() {

    try {
        if (await restore_lazarus() == false) {
            
            await install_fpcup(core.getInput('cpu'));
            await install_lazarus();
            await install_cross_compiler(core.getInput('cpu'));
            
            core.exportVariable('SAVE_CACHE_DIR', '.laz');
            core.exportVariable('SAVE_CACHE_KEY', cacheKey);
        }

        core.addPath(path.join(process.cwd(), '.laz/lazarus'));
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
