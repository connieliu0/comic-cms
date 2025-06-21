'use client'
import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';


const SimpleCMS = () => {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: false
  });

  const handleUpload = async () => {
    if (!image || !caption.trim()) {
      alert('Please add both an image and caption');
      return;
    }

    setIsUploading(true);
    
    try {
      // This would connect to your Supabase in a real app
      // For now, just simulate the upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate a simple slug from caption
      const slug = caption.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      alert(`Post created! Share link: /post/${slug}`);
      
      // Reset form
      setImage(null);
      setImagePreview('');
      setCaption('');
      
    } catch (error) {
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setImage(null);
    setImagePreview('');
    setCaption('');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border">
        
        {/* Upload Area */}
        <div className="p-6 border-b">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-red-500 bg-red-50' 
                : imagePreview 
                ? 'border-green-500 bg-green-50' 
                : 'border-red-500 bg-red-50 hover:bg-red-100'
            }`}
          >
            <input {...getInputProps()} />
            {imagePreview ? (
              <div className="space-y-4">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-h-64 mx-auto rounded-lg shadow-sm"
                />
                <p className="text-green-600 font-medium">Image selected</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-red-600 text-xl font-medium">Upload</p>
                <p className="text-gray-500">
                  {isDragActive ? 'Drop the image here' : 'Drag & drop an image or click to select'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Text Caption */}
        <div className="p-6 border-b">
          <div className="border-l-4 border-red-500 pl-4">
            <label className="block text-red-600 font-medium mb-2">Text</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Enter your caption here..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              rows={4}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 flex gap-4">
          <button
            onClick={handleUpload}
            disabled={isUploading || !image || !caption.trim()}
            className="px-6 py-2 border-2 border-black text-black font-medium hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Share link'}
          </button>
          
          <button
            onClick={handleRemove}
            className="px-6 py-2 border-2 border-black text-black font-medium hover:bg-black hover:text-white transition-colors"
          >
            Remove
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 border-2 border-black text-black font-medium hover:bg-black hover:text-white transition-colors"
          >
            New page
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleCMS;