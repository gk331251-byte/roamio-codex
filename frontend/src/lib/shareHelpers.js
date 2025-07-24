export function generateShareCaption({ city, xpEarned, badge }) {
  const badgeText = badge ? ` and unlocked ${badge}` : '';
  return `Explored ${city} with Roamio 🚶‍♂️ — earned ${xpEarned} XP${badgeText}! #MadeWithRoamio`;
}

export async function addWatermark(imageUrl, text = 'Made with Roamio') {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      ctx.font = `${Math.floor(canvas.width * 0.05)}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.textAlign = 'right';
      ctx.fillText(text, canvas.width - 10, canvas.height - 10);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}
