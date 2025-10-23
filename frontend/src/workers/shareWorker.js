self.onmessage = async (e) => {
  const { id, details, config } = e.data || {};
  try {
    const width = (config && config.layout === 'landscape') ? 1920 : 1080;
    const height = (config && config.layout === 'landscape') ? 1080 : 1920;

    if (typeof OffscreenCanvas === 'undefined') {
      // OffscreenCanvas not supported in this environment
      self.postMessage({ id, error: 'OffscreenCanvas not supported' });
      return;
    }

    const dpr = Math.max(1, Math.min(1.5, (self.devicePixelRatio || 1)) );
    const canvas = new OffscreenCanvas(Math.floor(width * dpr), Math.floor(height * dpr));
    const ctx = canvas.getContext('2d');
    if (ctx && typeof ctx.scale === 'function') ctx.scale(dpr, dpr);

    // Simple background
    ctx.fillStyle = (config && config.solidColorStart) || '#0f1114';
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = config && config.textColor || '#FFFFFF';
    ctx.font = `700 ${Math.max(32, Math.min(72, (config?.titleSize || 72) * (config?.layout === 'landscape' ? 0.85 : 1)))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const title = details?.title || details?.name || 'Untitled';
    const x = width / 2;
    const y = 120;
    // Very simple multiline truncation
    const maxWidth = width - 160;
    const words = title.split(' ');
    let line = '';
    let lineY = y;
    let lines = 0;
    for (let i = 0; i < words.length; i++) {
      const test = line + words[i] + ' ';
      const m = ctx.measureText(test).width;
      if (m > maxWidth && line !== '') {
        ctx.fillText(line.trim(), x, lineY);
        line = words[i] + ' ';
        lineY += 72;
        lines++;
        if (lines >= 2) break;
      } else {
        line = test;
      }
    }
    if (line && lines < 2) ctx.fillText(line.trim(), x, lineY);

    // Convert to blob and post back
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    // Transferable not necessary for blob but we post it back
    self.postMessage({ id, blob }, []);
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
