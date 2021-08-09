// npm run build && git add -A && git commit -m "dev" && git push

const core = require('@actions/core');
const exec = require('@actions/exec');
const toolcache = require('@actions/tool-cache');
const cache = require('@actions/cache');
const process = require('process');
const path = require('path');

const dir = path.normalize(path.resolve('../laz')).replace(/\\/g, "/");
const cacheKey = '[' + process.platform + '][' + core.getInput('cpu') + '][' + core.getInput('fpc-branch') + '][' + core.getInput('laz-branch') + ']';

async function bash(command_line) {
    await exec.exec('bash', ['-c', command_line.join(' ')]);
}

async function install_fpcup(cpu) {

    var dict = {};

    dict['linux'] = {
      'x86_64': 'https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/v2.0.0e/fpclazup-x86_64-linux',
      'aarch64': 'https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/v2.0.0e/fpclazup-x86_64-linux'
    }

    dict['win32'] = {
      'i386': 'https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/v2.0.0e/fpclazup-i386-win32.exe',
      'x86_64': 'https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/v2.0.0e/fpclazup-x86_64-win64.exe'
    }

    dict['darwin'] = {
      'x86_64': 'https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/v2.0.0e/fpclazup-x86_64-darwin'
    }
    
    try {
        console.log('Downloading: ', dict[process.platform][cpu]);
    } catch {
        throw new Error('Invalid cpu "' + cpu + '" on platform "' + process.platform + '"');
    }
    
    await toolcache.downloadTool(dict[process.platform][cpu], 'fpcup');
    await bash(['chmod +x fpcup']);
}

async function restore_lazarus() {

    var key = await cache.restoreCache([dir], cacheKey);
    if (key != null) {
        console.log('Restored lazarus from cache');
    }

    return key != null;
}

async function install_lazarus() {

    console.log('Installing Lazarus');

    await bash(['mkdir -p ' + dir]);
    await bash(['./fpcup',
                '--fpcURL=gitlab',
                '--lazURL=gitlab',
                '--fpcBranch=' + core.getInput('fpc-branch'),
                '--lazBranch=' + core.getInput('laz-branch'),
                '--installdir=' + dir,
                '--only=docker',
                '--noconfirm'
               ]);
}

async function install_cross_compiler(cpu) {
    
    if (cpu =='aarch64') {
        
        console.log('Installing cross compiler: AArch64');

        await toolcache.extractZip(await toolcache.downloadTool('https://github.com/LongDirtyAnimAlf/fpcupdeluxe/releases/download/crosslibs_v1.1/CrossLibsLinuxAarch64.zip'), dir);
        await toolcache.extractZip(await toolcache.downloadTool('https://github.com/LongDirtyAnimAlf/fpcupdeluxe/releases/download/linuxx64crossbins_v1.0/CrossBinsLinuxAarch64.zip'), path.join(dir, 'cross/bin'));
        
        await bash(['./fpcup',
                    '--installdir=' + dir,
                    '--ostarget=linux',
                    '--cputarget=aarch64',
                    '--only=FPCCleanOnly,FPCBuildOnly',
                    '--crossbindir=' + path.join(dir, 'cross/bin'),
                    '--crosslibdir=' + path.join(dir, 'cross/lib/aarch64-linux'),
                    '--noconfirm',
                    '--verbose'
                   ]);        
    }
}

async function install_dependencies(platform) {

	if (platform == 'linux') {
	
		console.log('Installing dependencies: Linux');
		
		await bash(['sudo apt-get update']);
		await bash(['sudo apt-get -m -y install libgtk2.0-dev libpango1.0-dev libxtst-dev']);
	}
} 

async function run() {

	console.log('Install Directory:', dir);
	console.log('Cache Key: ', cacheKey);

    try {
    	await install_dependencies(process.platform);
    
        if (await restore_lazarus() == false) {
            
            await install_fpcup(core.getInput('cpu'));
            await install_lazarus();
            await install_cross_compiler(core.getInput('cpu'));
            
            core.exportVariable('SAVE_CACHE_DIR', dir);
            core.exportVariable('SAVE_CACHE_KEY', cacheKey);
        }

        core.addPath(path.join(dir, 'lazarus'));
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
