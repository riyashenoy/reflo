// Stub for optional WebGPU backend — we use WebGL for pose detection.
module.exports = {
  webgpu_util: {
    flatDispatchLayout: () => ({}),
    computeDispatch: () => ({}),
  },
  WebGPUBackend: class WebGPUBackend {},
};
