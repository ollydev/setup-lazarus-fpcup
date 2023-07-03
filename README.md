Github Action which builds FPC and Lazarus on a runner using [fpcup](https://github.com/LongDirtyAnimAlf/Reiniero-fpcup). Useful for building projects with custom FPC & Lazarus versions.

Supported platforms:

- Windows: `win64`, `win32` (cross compiled)
- Linux: `x86_64`, `aarch64` (cross compiled)
- MacOS: `x86_64`, `aarch64` (cross compiled)

Installations are cached so expect that first builds could take ~20 minutes (MacOS being the slowest)

Caches that are not in a week are [removed](https://github.com/actions/cache#cache-limits)

---

### Required Inputs
  
- `laz` - Lazarus GitLab branch or commit sha to install
- `fpc` - FPC GitLab branch or commit sha to install

### Optional Inputs

- `fpcup` - fpcup version to use from https://github.com/LongDirtyAnimAlf/Reiniero-fpcup/releases (defaults to [v2.2.0q](https://github.com/ollydev/setup-lazarus-fpcup/blob/master/action.yml))

---

### Example usage

```yml
name: Test
on: push
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
            
          - name: Linux (aarch64)  
            os: ubuntu-latest
            args: --os=linux --cpu=aarch64
            
          - name: MacOS 64
            os: macos-latest
            args: --os=darwin --cpu=x86_64 --widgetset=cocoa
 
          - name: MacOS (aarch64)
            os: macos-latest
            args: --os=darwin --cpu=aarch64 --widgetset=cocoa 
            
    steps:
      - name: Install Lazarus
        uses: ollydev/setup-lazarus-fpcup@v3.3
        with:
          laz: lazarus_2_2_4
          fpc: release_3_2_2
          # Commit SHA example
          # laz: 537f43754ca77e39f15839299b9f7059e39f90dd
          # fpc: 3f7bf0fd70b339a43889898efa59af4fec33ea84         
      
      - uses: actions/checkout@v3.1.0      
      
      - name: Build Test
        run: |
          lazbuild ${{ matrix.config.args }} test_lazarus.lpi
          
      - name: Run Test
        if: matrix.config.name != 'Linux (aarch64)' && matrix.config.name != 'MacOS (aarch64)' # cross compiled, cannot run on runner
        run: |
          ./test
```

