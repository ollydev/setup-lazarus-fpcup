// npm install
// npm run build && git add -A && git commit --amend -m "dev" && git push -f
const core = require('@actions/core');
const exec = require('@actions/exec');
const tc = require('@actions/tool-cache');
const cache = require('@actions/cache');
const process = require('process');
const path = require('path');
const base64 = require('base-64');

const
    fpcup_downloads = {
        'linux':  'fpclazup-x86_64-linux',
        'win32':  'fpclazup-x86_64-win64.exe',
        'darwin': 'fpclazup-x86_64-darwin'
    }

const
    fpc_branch    = core.getInput('fpc-branch');
    fpc_revision  = core.getInput('fpc-revision');
    laz_branch    = core.getInput('laz-branch');
    laz_revision  = core.getInput('laz-revision');
    
    fpcup_release = core.getInput('fpcup-release');
   
const
    fpcup_download_url = 'https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/' + fpcup_release + '/' + fpcup_downloads[process.platform];
	fpcup_executable   = unixify(path.join(path.dirname(process.env['GITHUB_WORKSPACE']), 'fpcup_executable'));
	fpcup_install_path = unixify(path.join(path.dirname(process.env['GITHUB_WORKSPACE']), 'fpcup'));

	cache_key = base64.encode(fpcup_download_url + '|' + fpc_branch + '|' + fpc_revision + '|' + laz_branch + '|' + laz_revision);

function unixify(s) {

	return s.split(path.sep).join(path.posix.sep);
}
	
async function bash(command_line) {

    await exec.exec('bash', ['-c', command_line.join(' ')]);
}

async function restore_lazarus() {

	console.log('Looking for cache ' + base64.decode(cache_key));

	return await cache.restoreCache([fpcup_install_path], cache_key) != null;
}

async function install_lazarus() {

    await tc.downloadTool(fpcup_download_url, fpcup_executable);
    await bash(['chmod +x ' + fpcup_executable]);

    fpcVersion = fpc_branch != '' ? '--fpcBranch=' + fpc_branch : '--fpcRevision=' + fpc_revision;
    lazVersion = laz_branch != '' ? '--lazBranch=' + laz_branch : '--lazRevision=' + laz_revision;
    
    await bash([fpcup_executable, fpcVersion, lazVersion, '--only=docker', '--noconfirm', '--verbose', '--installdir=' + fpcup_install_path]);

    // install cross compiler
    switch (process.platform) {
		case "win32":
			await bash([fpcup_executable, '--ostarget=win32', '--cputarget=i386', '--only=FPCCleanOnly,FPCBuildOnly', '--noconfirm', '--verbose', '--installdir=' + fpcup_install_path]);
			break;
		
		case "linux":
			await bash([fpcup_executable, '--ostarget=linux', '--cputarget=aarch64', '--only=FPCCleanOnly,FPCBuildOnly', '--autotools', '--noconfirm', '--verbose', '--installdir=' + fpcup_install_path]);
			break;
	}
	
	// causes cache restore issues with symlinks and macos bundles.
	await bash(['find "' + fpcup_install_path + '" -name "*.app" -type d -prune -exec rm -rf {} +']);
	
	// pass to post.js
	core.exportVariable('SAVE_CACHE_DIR', fpcup_install_path);
    core.exportVariable('SAVE_CACHE_KEY', cache_key);
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
