import React, { useEffect, useState } from 'react';
import { generateShareCaption, addWatermark } from '../lib/shareHelpers';
import { getAuth } from 'firebase/auth';
import { setSkipSharePrompt } from '../lib/firebase';

export default function PostQuestShareModal({
  open,
  imageUrl = '',
  city = '',
  xpEarned = 0,
  badge = '',
  showWatermark = true,
  onClose,
}) {
  const [caption, setCaption] = useState('');
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    if (open) {
      setCaption(generateShareCaption({ city, xpEarned, badge }));
    }
  }, [open, city, xpEarned, badge]);

  if (!open) return null;

  const handleDownload = async () => {
    const url = showWatermark ? await addWatermark(imageUrl) : imageUrl;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roamio-postcard.png';
    a.click();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      alert('Caption copied to clipboard');
    } catch (err) {
      console.error('copy failed', err);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: caption, url: imageUrl });
      } else {
        await handleCopy();
      }
    } catch (err) {
      console.error('share failed', err);
    }
  };

  const handleClose = async () => {
    if (skip) {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) await setSkipSharePrompt(user.uid, true);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white w-full max-w-md mx-4 p-4 rounded-lg">
        <h2 className="text-lg font-bold text-center mb-3">Share your adventure!</h2>
        {imageUrl && (
          <img src={imageUrl} alt="Postcard" className="w-full rounded mb-3" />
        )}
        <textarea
          className="w-full border rounded p-2 text-sm mb-3"
          rows={3}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <div className="space-y-2">
          <button onClick={handleDownload} className="w-full py-2 bg-green-600 text-white rounded">
            Download Postcard
          </button>
          <button onClick={handleCopy} className="w-full py-2 bg-blue-600 text-white rounded">
            Copy Caption
          </button>
          <button onClick={handleShare} className="w-full py-2 bg-purple-600 text-white rounded">
            Share...
          </button>
        </div>
        <label className="flex items-center gap-2 mt-3 text-xs">
          <input type="checkbox" checked={skip} onChange={(e) => setSkip(e.target.checked)} />
          Don't show this again
        </label>
        <div className="text-center mt-3">
          <button onClick={handleClose} className="px-4 py-1 bg-gray-700 text-white rounded">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
