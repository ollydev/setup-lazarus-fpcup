// npm install
// npm run build && git add -A && git commit -m "dev" && git push

const core = require('@actions/core');
const exec = require('@actions/exec');
const tc = require('@actions/tool-cache');
const cache = require('@actions/cache');
const process = require('process');
const path = require('path');
const sha1 = require('sha1');
const util = require('util');

const
    fpcup_downloads = {
        'linux' : 'https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/%s/fpclazup-x86_64-linux',
        'win32' : 'https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/%s/fpclazup-x86_64-win64.exe',
        'darwin': 'https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/%s/fpclazup-x86_64-darwin'
    }

async function bash(command_line) {

    await exec.exec('bash', ['-c', command_line.join(' ')]);
}

async function install_fpcup(url) {

    await tc.downloadTool(url, 'fpcup');
    await bash(['chmod +x fpcup']);
}

async function restore_lazarus(dir, key) {

    var key = await cache.restoreCache([dir], key);
    if (key != null) {
        console.log('Restored lazarus from cache');
    }

    return key != null;
}

async function install_win32_cross(dir) {
	
	await bash(['./fpcup',
				'--verbose',
				'--noconfirm',
				'--installdir="' + dir + '"',
				'--ostarget=win32',
        		'--cputarget=i386',
        		'--only=FPCCleanOnly,FPCBuildOnly',
    		   ]);	
}

async function install_aarch64_cross(dir) {
	
	await tc.extractZip(await tc.downloadTool('https://github.com/LongDirtyAnimAlf/fpcupdeluxe/releases/download/crosslibs_v1.1/CrossLibsLinuxAarch64.zip'), dir);
    await tc.extractZip(await tc.downloadTool('https://github.com/LongDirtyAnimAlf/fpcupdeluxe/releases/download/linuxx64crossbins_v1.0/CrossBinsLinuxAarch64.zip'), path.join(dir, 'cross/bin'));

    await bash(['./fpcup',
				'--verbose',
				'--noconfirm',
				'--installdir="' + dir + '"',
				'--ostarget=linux',
				'--cputarget=aarch64',
				'--only=FPCCleanOnly,FPCBuildOnly',
				'--crossbindir="' + path.join(dir, 'cross/bin') + '"',
				'--crosslibdir="' + path.join(dir, 'cross/lib/aarch64-linux') + '"',
			   ]);	
}

async function install_lazarus(dir) {

    var fpcVersion = '';
    if (core.getInput('fpc-branch') != '') {
        fpcVersion = '--fpcBranch="' + core.getInput('fpc-branch') + '"';
    } else {
        fpcVersion = '--fpcRevision="' + core.getInput('fpc-revision') + '"';
    }
    
    var lazVersion = '';
    if (core.getInput('laz-branch') != '') {
        lazVersion = '--lazBranch="' + core.getInput('laz-branch') + '"';
    } else {
        lazVersion = '--lazRevision="' + core.getInput('laz-revision') + '"';
    }
    
    await bash(['./fpcup',
				'--verbose',
				'--noconfirm',
				'--installdir="' + dir + '"',
				'--only="docker"',
				'--fpcURL="gitlab"',
				fpcVersion,
				lazVersion
    		   ]);

	if (process.platform == 'win32') {
		install_win32_cross(dir);
	}
    if (process.platform == 'linux') {
        install_aarch64_cross(dir);
    }
}

async function run() {

    try 
    {
        if (process.platform == 'linux') {
            await bash(['sudo apt-get update']);
            await bash(['sudo apt-get -m -y install libgtk2.0-dev libpango1.0-dev libxtst-dev']);
        }

        try {
            url = util.format(fpcup_downloads[process.platform], core.getInput('fpcup-release'));
        } catch {
            throw new Error('Invalid platform "' + process.platform + '"');
        }

		key = sha1(
		    util.format('[%s][%s][%s][%s][%s]', [url, core.getInput('fpc-branch'), core.getInput('fpc-revision'),core.getInput('laz-branch'), core.getInput('laz-revision')])
		);
		
        dir = path.resolve('../laz');
        dir = dir.split(path.sep).join(path.posix.sep); // Convert to unix path
       
        core.info(url);
        core.info(dir);

        if (await restore_lazarus(dir, key) == false) {

            await install_fpcup(url);
            await install_lazarus(dir);

            // Pass to post.js
            core.exportVariable('SAVE_CACHE_DIR', dir);
            core.exportVariable('SAVE_CACHE_KEY', key);
        }

        core.addPath(path.join(dir, 'lazarus'));
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
