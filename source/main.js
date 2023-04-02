// npm install
// npm run build && git add -A && git commit --amend -m "dev" && git push -f
const core = require('@actions/core');
const exec = require('@actions/exec');
const tc = require('@actions/tool-cache');
const cache = require('@actions/cache');
const process = require('process');
const path = require('path');

const
    fpcup_downloads = {
        'linux':  'fpclazup-x86_64-linux',
        'win32':  'fpclazup-x86_64-win64.exe',
        'darwin': 'fpclazup-x86_64-darwin'
    }

const
    fpc = core.getInput('fpc');
    laz = core.getInput('laz');
    
    fpcup = core.getInput('fpcup'); 
    fpcup_download_url = 'https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/' + fpcup + '/' + fpcup_downloads[process.platform]; 
   
const
	fpcup_executable   = unixify(path.join(path.dirname(process.env['GITHUB_WORKSPACE']), 'fpcup_executable'));
	fpcup_install_path = unixify(path.join(path.dirname(process.env['GITHUB_WORKSPACE']), 'fpcup'));

	cache_key = '[' + fpc + '][' + laz + '][' + fpcup_download_url + ']';
    cache_disable = false
    
function is_git_sha(hash) {

    return /^[0-9a-f]{7,40}$/i.test(hash)
}

function unixify(s) {

	return s.split(path.sep).join(path.posix.sep);
}
	
async function bash(command_line) {

    await exec.exec('bash', ['-c', command_line.join(' ')]);
}

async function restore_lazarus() {

    if (cache_disable) {
        return false;
    }
	return await cache.restoreCache([fpcup_install_path], cache_key) != null;
}
    
async function download_fpcup() {

    await tc.downloadTool(fpcup_download_url, fpcup_executable);
    await bash(['chmod +x ' + fpcup_executable]);    
}

async function install_lazarus() {

    await download_fpcup();
    await bash(['mkdir -p ' + fpcup_install_path]);

    fpc_dir = fpcup_install_path + '/fpc';
    laz_dir = fpcup_install_path + '/lazarus';

    if (is_git_sha(fpc)) {
        await bash(['git', 'clone', 'https://gitlab.com/freepascal.org/fpc/source', fpc_dir]);
        await bash(['git', '-C', fpc_dir, 'checkout', fpc]);
    } else {
        await bash(['git', 'clone', '--depth 1', '--branch', fpc, 'https://gitlab.com/freepascal.org/fpc/source', fpc_dir]);
    }
    
    if (is_git_sha(laz)) {
        await bash(['git', 'clone', 'https://gitlab.com/freepascal.org/lazarus/lazarus', laz_dir]);
        await bash(['git', '-C', laz_dir, 'checkout', laz]);
    } else {
        await bash(['git', 'clone', '--depth 1', '--branch', laz, 'https://gitlab.com/freepascal.org/lazarus/lazarus', laz_dir]);
    }    
    
    await bash([fpcup_executable, '--only=FPCCleanOnly,FPCBuildOnly,LazarusCleanOnly,LazBuild,LazarusConfigOnly', '--noconfirm', '--verbose', '--installdir=' + fpcup_install_path]);

    // install cross compiler
    switch (process.platform) {
		case 'win32':
			await bash([fpcup_executable, '--ostarget=win32', '--cputarget=i386', '--only=FPCCleanOnly,FPCBuildOnly', '--autotools', '--noconfirm', '--installdir=' + fpcup_install_path]);
			break;
		
		case 'linux':
			await bash([fpcup_executable, '--ostarget=linux', '--cputarget=aarch64', '--only=FPCCleanOnly,FPCBuildOnly', '--autotools', '--noconfirm', '--installdir=' + fpcup_install_path]);
			break;
			
		case 'darwin':
			await bash([fpcup_executable, '--ostarget=darwin', '--cputarget=aarch64', '--only=FPCCleanOnly,FPCBuildOnly', '--autotools', '--noconfirm', '--installdir=' + fpcup_install_path]);
			break;		    
	}
	
	// causes cache restore issues with symlinks and macos bundles.
	await bash(['find "' + fpcup_install_path + '" -name "*.app" -type d -prune -exec rm -rf {} +']);
	
	// pass to post.js
	if (!cache_disable) { 
	    core.exportVariable('SAVE_CACHE_DIR', fpcup_install_path);
        core.exportVariable('SAVE_CACHE_KEY', cache_key);
    }
}

async function run() {

    try {
        if (process.platform == 'linux') {
            await bash(['sudo apt-get update']);
            await bash(['sudo apt-get -m -y install libgtk2.0-dev libpango1.0-dev libxtst-dev']);
        }
        
        if (await restore_lazarus() == false) {
            await install_lazarus();
        }
        
        core.addPath(path.join(fpcup_install_path, 'lazarus'));
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
