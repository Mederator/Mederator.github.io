import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    three: ['three'],
                    ammo: ['ammo'],
                },
            },
        },
        chunkSizeWarningLimit: 100000,
    },
    resolve: {
        alias: {
            'three-to-ammo': './node_modules/three-to-ammo/index.js',
        },
    },
    plugins: [glsl()],
    assetsInclude: ['**/*.glb'],
});

