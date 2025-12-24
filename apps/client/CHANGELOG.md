# Release Notes - v1.0.34

## Fixed Launch Issues
This release addresses critical issues with launching Forge and NeoForge modpacks:

### 1. NeoForge 1.21+ Launch Fix
- **Problem**: Launch failed with `java.lang.module.FindException: Module org.objectweb.asm not found`.
- **Cause**: The module path Construction was incorrectly identifying `asm-commons` or other partial matches as the core `asm` library, or missing it entirely due to library naming changes in NeoForge 1.21.
- **Fix**: Implemented strict Maven coordinate matching (`org.ow2.asm:asm:`) to ensure the core ASM library is correctly placed on the module path.

### 2. Forge 1.20.1 "Installer Code 1" Fix
- **Problem**: Modpack installers failed with exit code 1.
- **Cause**: The launcher was using `javaw.exe` to run installers. Some installers (like Forge 1.20.1) require a console-attached Java process (`java.exe`) to initialize properly on Windows.
- **Fix**: Automatically switches from `javaw.exe` to `java.exe` when running installers, ensuring full log capture and successful execution.

### 3. general Improvements
- **JVM Arguments**: Corrected the injection of `--add-opens` and `-p` arguments to prevent `minecraft-launcher-core` from overwriting them.
- **Maven-Artifact Conflict**: Fixed a conflict where `maven-artifact` caused duplicate module errors by adding it to the `-DignoreList` while keeping it on the module path for Forge Mod Loader (FML) access.
- **Java Path Handling**: Ensured the managed Java Runtime path is correctly passed to all launcher components.
