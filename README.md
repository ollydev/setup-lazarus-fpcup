Action which builds FPC and Lazarus using [fpcup](https://github.com/LongDirtyAnimAlf/Reiniero-fpcup).

Installations are cached so expect that first builds could take ~10 minutes.
Caches that are not in a week are [removed](https://github.com/actions/cache#cache-limits).

---

### Inputs
  
- `fpcup-release`: fpcup release tag to download and install Lazarus with
- `laz-branch`: Lazarus (gitlab) branch to install
- `laz-revision`: Lazarus (gitlab) commit hash to install
- `fpc-branch`: FPC (gitlab) branch to install
- `fpc-revision`: FPC (gitlab) commit hash to install

---

### Example usage

```yml
name: Test

on: 
  push:
    branches:
      - '**'
  pull_request:
    branches:
      - '**'
      
jobs:
  test:
    name: ${{ matrix.config.name }}
    runs-on: ${{ matrix.config.os }}
    defaults:
      run:
        shell: bash
    strategy:
      fail-fast: false
      matrix:
        config:            
          - name: Windows 64
            os: windows-latest
            args: --os=win64 --cpu=x86_64
            
          - name: Windows 32  
            os: windows-latest
            args: --os=win32 --cpu=i386

          - name: Linux 64
            os: ubuntu-latest
            args: --os=linux --cpu=x86_64
            
          - name: AArch64  
            os: ubuntu-latest
            args: --os=linux--cpu=aarch64
            
          - name: MacOS 64
            os: macos-latest
            args: --os=darwin --cpu=x86_64 --widgetset=cocoa
            
    steps:
      - uses: actions/checkout@v2.3.4
      
      - name: Install Lazarus
        uses: ollydev/setup-lazarus-fpcup@v2.2
        with: 
          fpcup-release: v2.2.0c
          laz-branch: lazarus_2_2_0_rc1 # laz-revision: 58bab5263932362aa35a59bf0cd9439dfe87b25c
          fpc-branch: release_3_2_2_rc1 # fpc-revision: 6e6c946e0fd1765f99110e12c79db27a400c6587
      
      - name: Test Installation
        if: matrix.config.name != 'AArch64' # AArch64 was cross compiled!
        run: |
          lazbuild --version
```

