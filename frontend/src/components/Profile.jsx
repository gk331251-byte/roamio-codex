import React from 'react';
import PostcardGallery from './PostcardGallery';

const Profile = () => (
  <div className="min-h-screen bg-[#f8fcf8] px-6 py-10 text-[#0e1b0e] font-sans">
    <h1 className="text-3xl font-bold mb-6">Your Postcard Collection</h1>
    <PostcardGallery />
  </div>
);

export default Profile;
