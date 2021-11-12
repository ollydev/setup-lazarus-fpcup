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
        'linux': {
            'x86_64': 'https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/%s/fpclazup-x86_64-linux',
            'aarch64': 'https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/%s/fpclazup-x86_64-linux'
        },
        'win32': {
            'i386': 'https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/%s/fpclazup-x86_64-win64.exe',
            'x86_64': 'https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/%s/fpclazup-x86_64-win64.exe'
        },
        'darwin': {
            'x86_64': 'https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases/download/%s/fpclazup-x86_64-darwin'
        }
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
				'--only="CrossWin64-32"',
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

    var version = '';
    if (core.getInput('fpc-branch') != '') {
        version = '--fpcBranch="' + core.getInput('fpc-branch') + '"';
    } else {
        version = '--fpcRevision="' + core.getInput('fpc-revision') + '"';
    }

    await bash(['./fpcup',
        '--verbose',
        '--noconfirm',
        '--installdir="' + dir + '"',
        '--only="FPCGetOnly,FPC"',
        '--fpcURL="gitlab"',
        version
    ]);

    var version = '';
    if (core.getInput('laz-branch') != '') {
        version = '--lazBranch="' + core.getInput('laz-branch') + '"';
    } else {
        version = '--lazRevision="' + core.getInput('laz-revision') + '"';
    }

    await bash(['./fpcup',
        '--verbose',
        '--noconfirm',
        '--installdir="' + dir + '"',
        '--only="LazarusGetOnly,LazBuildOnly"',
        '--lazURL="gitlab"',
        version
    ]);


	if (core.getInput('cpu') == 'i386') {
		install_win32_cross(dir);
	}
    if (core.getInput('cpu') == 'aarch64') {
        install_aarch64_cross(dir);
    }
}

async function run() {

    try {
        if (process.platform == 'linux') {
            await bash(['sudo apt-get update']);
            await bash(['sudo apt-get -m -y install libgtk2.0-dev libpango1.0-dev libxtst-dev']);
        }

        try {
            url = fpcup_downloads[process.platform][core.getInput('cpu')];
            url = util.format(url, core.getInput('fpcup-release'));
        } catch {
            throw new Error('Invalid cpu "' + core.getInput('cpu') + '" on platform "' + process.platform + '"');
        }

		var key = util.format('[%s][%s][%s][%s][%s][%s]', [
							   url,
							   core.getInput('cpu'),
							   core.getInput('fpc-branch'),
							   core.getInput('fpc-revision'),
							   core.getInput('laz-branch'),
							   core.getInput('laz-revision') 
							 ]);

        var dir = path.resolve('../laz');
        var dir = dir.split(path.sep).join(path.posix.sep); // Convert to unix path
       
        core.info(url);
        core.info(key);
        core.info(dir);

        if (await restore_lazarus(dir, sha1(key)) == false) {

            await install_fpcup(url);
            await install_lazarus(dir);

            // Pass to post.js
            core.exportVariable('SAVE_CACHE_DIR', dir);
            core.exportVariable('SAVE_CACHE_KEY', sha1(key));
        }

        core.addPath(path.join(dir, 'lazarus'));
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
