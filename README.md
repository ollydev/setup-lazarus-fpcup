Action which builds FPC and Lazarus using [fpcup](https://github.com/LongDirtyAnimAlf/Reiniero-fpcup).

Installations are cached so expect that first builds could take ~10 minutes.
Caches that are not in a week are [removed](https://github.com/actions/cache#cache-limits).

---

### Inputs
  
- `cpu`: CPU target to setup Lazarus for. 
- `laz-branch`: Lazarus (gitlab) branch to install
- `fpc-branch`: FPC (gitlab) branch to install

Supported CPU targets:
- `x86_64`: Windows, Linux, macOS
- `i386`: Windows
- `aarch64`: Linux (Cross compiled)

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
            cpu: x86_64
            
          - name: Windows 32  
            os: windows-latest
            cpu: i386

          - name: Linux 64
            os: ubuntu-latest
            cpu: x86_64

          - name: AArch64  
            os: ubuntu-latest
            cpu: aarch64
            
          - name: MacOS 64
            os: macos-latest
            cpu: x86_64
            
    steps:
      - uses: actions/checkout@v2.3.4
      
      - name: Install Lazarus
        uses: ollydev/setup-lazarus-fpcup@v2
        with:
          cpu: ${{ matrix.config.cpu }}
          laz-branch: lazarus_2_2_0_rc1
          fpc-branch: release_3_2_2_rc1
      
      - name: Test Installation
        if: matrix.config.name != 'AArch64' # AArch64 was cross compiled!
        run: |
          lazbuild --version
```
