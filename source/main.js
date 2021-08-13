// npm run build && git add -A && git commit -m "dev" && git push

const core = require('@actions/core');
const exec = require('@actions/exec');
const toolcache = require('@actions/tool-cache');
const cache = require('@actions/cache');
const process = require('process');
const path = require('path');

var fpcup_downloads = {};

fpcup_downloads['linux'] = {
  'x86_64': 'https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/v2.0.1/fpclazup-x86_64-linux',
  'aarch64': 'https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/v2.0.1/fpclazup-x86_64-linux'
}

fpcup_downloads['win32'] = {
  'i386': 'https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/v2.0.1/fpclazup-i386-win32.exe',
  'x86_64': 'https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/v2.0.1/fpclazup-x86_64-win64.exe'
}

fpcup_downloads['darwin'] = {
  'x86_64': 'https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/v2.0.1/fpclazup-x86_64-darwin'
}

var cacheKey = '';
var fpcupURL, fpcupPath = '';

async function init(platform, cpu, fpcup, fpcBranch, lazBranch) {

	fpcupURL = fpcup;
	if (fpcupURL == '') {
		try {
		    fpcupURL = fpcup_downloads[platform][cpu];
		} catch {
		    throw new Error('Invalid cpu "' + cpu + '" on platform "' + platform + '"');
		}	
	}

	cacheKey = '[' + fpcupURL + '][' + cpu + '][' + fpcBranch + '][' + lazBranch + ']';
	
	fpcupPath = path.resolve('../laz');
	fpcupPath = path.normalize(fpcupPath).replace(/\\/g, "/");
	
	console.log('cacheKey: ', cacheKey);
	console.log('fpcupURL: ', fpcupURL);
	console.log('fpcupPath: ', fpcupPath);
} 

async function bash(command_line) {
    await exec.exec('bash', ['-c', command_line.join(' ')]);
}

async function install_fpcup() {

	console.log('Downloading: ', fpcupPath);

    await toolcache.downloadTool(fpcupURL, 'fpcup');
    await bash(['chmod +x fpcup']);
}

async function restore_lazarus() {

    var key = await cache.restoreCache([fpcupPath], cacheKey);
    if (key != null) {
        console.log('Restored lazarus from cache');
    }

    return key != null;
}

async function install_lazarus() {

    console.log('Installing Lazarus');

    await bash(['mkdir -p ' + fpcupPath]);
    await bash(['./fpcup',
                '--fpcURL=gitlab',
                '--lazURL=gitlab',
                '--fpcBranch=' + core.getInput('fpc-branch'),
                '--lazBranch=' + core.getInput('laz-branch'),
                '--installdir=' + fpcupPath,
                '--only=docker',
                '--noconfirm'
               ]);
}

async function install_cross_compiler(cpu) {
    
    if (cpu =='aarch64') {
        
        console.log('Installing cross compiler: AArch64');

        await toolcache.extractZip(await toolcache.downloadTool('https://github.com/LongDirtyAnimAlf/fpcupdeluxe/releases/download/crosslibs_v1.1/CrossLibsLinuxAarch64.zip'), fpcupPath);
        await toolcache.extractZip(await toolcache.downloadTool('https://github.com/LongDirtyAnimAlf/fpcupdeluxe/releases/download/linuxx64crossbins_v1.0/CrossBinsLinuxAarch64.zip'), path.join(fpcupPath, 'cross/bin'));
        
        await bash(['./fpcup',
                    '--installdir=' + fpcupPath,
                    '--ostarget=linux',
                    '--cputarget=aarch64',
                    '--only=FPCCleanOnly,FPCBuildOnly',
                    '--crossbindir=' + path.join(fpcupPath, 'cross/bin'),
                    '--crosslibdir=' + path.join(fpcupPath, 'cross/lib/aarch64-linux'),
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

    try {
    	await init(process.platform, core.getInput('cpu'), core.getInput('fpcup-url'), core.getInput('fpc-branch'), core.getInput('laz-branch'));
    	await install_dependencies(process.platform);
    
        if (await restore_lazarus() == false) {
        
            await install_fpcup();
            await install_lazarus();
            await install_cross_compiler(core.getInput('cpu'));
            
            core.exportVariable('SAVE_CACHE_DIR', fpcupPath);
            core.exportVariable('SAVE_CACHE_KEY', cacheKey);
        }

        core.addPath(path.join(fpcupPath, 'lazarus'));
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
