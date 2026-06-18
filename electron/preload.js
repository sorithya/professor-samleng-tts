const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
  saveFileAndReveal: (fileName, base64Data) => ipcRenderer.invoke('save-file-and-reveal', fileName, base64Data),

  // VoxCPM2 configuration
  browseVoxCPM2: () => ipcRenderer.invoke('browse-voxcpm2'),
  getVoxCPM2Config: () => ipcRenderer.invoke('get-voxcpm2-config'),
  saveVoxCPM2Config: (config) => ipcRenderer.invoke('save-voxcpm2-config', config),
  startVoxCPM2: () => ipcRenderer.invoke('start-voxcpm2'),
  stopVoxCPM2: () => ipcRenderer.invoke('stop-voxcpm2'),

  // OmniVoice configuration
  browseOmniVoice: () => ipcRenderer.invoke('browse-omnivoice'),
  getOmniVoiceConfig: () => ipcRenderer.invoke('get-omnivoice-config'),
  saveOmniVoiceConfig: (config) => ipcRenderer.invoke('save-omnivoice-config', config),
  startOmniVoice: () => ipcRenderer.invoke('start-omnivoice'),
  stopOmniVoice: () => ipcRenderer.invoke('stop-omnivoice'),

  // Fish Speech configuration
  browseFishSpeech: () => ipcRenderer.invoke('browse-fishspeech'),
  getFishSpeechConfig: () => ipcRenderer.invoke('get-fishspeech-config'),
  saveFishSpeechConfig: (config) => ipcRenderer.invoke('save-fishspeech-config', config),
  startFishSpeech: () => ipcRenderer.invoke('start-fishspeech'),
  stopFishSpeech: () => ipcRenderer.invoke('stop-fishspeech'),

  isElectron: true,
});
