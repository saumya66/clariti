# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for autoqa-backend
# Run: pyinstaller autoqa-backend.spec
# Output: dist/autoqa-backend (single binary)

block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=[],
    datas=[
        ('agents', 'agents'),
        ('models', 'models'),
        ('data', 'data'),
    ],
    hiddenimports=[
        # uvicorn dynamic imports
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.loops.asyncio',
        'uvicorn.loops.uvloop',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.http.httptools_impl',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.protocols.websockets.websockets_impl',
        'uvicorn.protocols.websockets.wsproto_impl',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'uvicorn.lifespan.off',
        # fastapi / starlette
        'starlette.routing',
        'starlette.middleware',
        'starlette.middleware.cors',
        # multipart
        'multipart',
        'python_multipart',
        # PIL
        'PIL',
        'PIL.Image',
        # cv2
        'cv2',
        # anthropic / google
        'anthropic',
        'google.genai',
        # pyautogui dependencies
        'pyautogui',
        'pynput',
        # macOS frameworks
        'Quartz',
        'AppKit',
        'Foundation',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='autoqa-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,   # keep True so logs are visible in Electron console
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
