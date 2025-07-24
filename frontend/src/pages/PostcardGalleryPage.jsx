import React from 'react';
import PostcardGallery from '../components/PostcardGallery';

export default function PostcardGalleryPage() {
  return (
    <div className="min-h-screen px-6 py-8 bg-[#f8fcf8] text-[#0e1b0e]">
      <h1 className="text-2xl font-bold mb-4">Your Postcard Gallery</h1>
      <PostcardGallery />
    </div>
  );
}
