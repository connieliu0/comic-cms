'use client'
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import { useRouter, useSearchParams } from 'next/navigation';
import { getComic, updateComic, Comic } from '../../../lib/supabase-utils';
import '../styles/cms.css';

interface Page {
  id: string;
  image: File | string;
  caption: string;
  createdAt: Date;
}

function EditComicContent() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  
  const [originalComic, setOriginalComic] = useState<Comic | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editText, setEditText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [comicTitle, setComicTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedComicId, setSavedComicId] = useState('');
  const [showShareLinks, setShowShareLinks] = useState(false);

  const currentPage = pages[currentPageIndex] || null;

  useEffect(() => {
    async function loadComic() {
      if (!editId) {
        setError('No comic ID provided');
        return;
      }
      
      setLoading(true);
      try {
        const comicData = await getComic(editId);
        if (comicData && comicData.pages) {
          setComicTitle(comicData.title || '');
          setSavedComicId(editId);
          setShowShareLinks(true);
          
          const localPages = comicData.pages.map(page => ({
            id: page.id || Date.now().toString(),
            image: page.image_url,
            caption: page.caption || '',
            createdAt: new Date()
          }));
          
          setPages(localPages);
          setCurrentPageIndex(0);
        } else {
          setError('Comic not found');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load comic';
        console.error('Error loading comic:', errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    loadComic();
  }, [editId]);

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

  const createNewPage = async () => {
    if (!image || !caption.trim()) {
      alert('Please add both an image and caption');
      return;
    }

    setIsUploading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newPage = {
        id: Date.now().toString(),
        image: image, // Store the File object for new pages
        caption: caption,
        createdAt: new Date()
      };
      
      const insertIndex = pages.length === 0 ? 0 : currentPageIndex + 1;
      const newPages = [...pages];
      newPages.splice(insertIndex, 0, newPage);
      
      setPages(newPages);
      setCurrentPageIndex(insertIndex);
      
      setImage(null);
      setImagePreview('');
      setCaption('');
      
    } catch (error) {
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeCurrentPage = () => {
    if (currentPage && pages.length > 0) {
      const newPages = pages.filter((_, index) => index !== currentPageIndex);
      setPages(newPages);
      
      if (newPages.length === 0) {
        setCurrentPageIndex(0);
      } else if (currentPageIndex >= newPages.length) {
        setCurrentPageIndex(newPages.length - 1);
      }
      setIsEditingText(false);
    }
  };

  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
      setIsEditingText(false);
    }
  };

  const goToNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
      setIsEditingText(false);
    }
  };

  const startEditingText = () => {
    if (currentPage) {
      setEditText(currentPage.caption);
      setIsEditingText(true);
    }
  };

  const saveEditedText = () => {
    if (currentPage && editText.trim()) {
      const updatedPages = [...pages];
      updatedPages[currentPageIndex] = {
        ...currentPage,
        caption: editText.trim()
      };
      setPages(updatedPages);
      setIsEditingText(false);
      setEditText('');
    }
  };

  const cancelEditingText = () => {
    setIsEditingText(false);
    setEditText('');
  };

  const replaceCurrentImage = (acceptedFiles) => {
    if (currentPage && acceptedFiles[0]) {
      const file = acceptedFiles[0];
      
      const updatedPages = [...pages];
      updatedPages[currentPageIndex] = {
        ...currentPage,
        image: file // Store the new File object
      };
      setPages(updatedPages);
    }
  };

  const { getRootProps: getReplaceRootProps, getInputProps: getReplaceInputProps } = useDropzone({
    onDrop: replaceCurrentImage,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: false
  });

  const handleSaveComic = async () => {
    if (pages.length === 0) {
      alert('Please create at least one page before saving');
      return;
    }

    if (!editId) {
      alert('No comic ID found');
      return;
    }

    setIsSaving(true);
    
    try {
      // Convert pages to the format expected by updateComic
      const pagesToSave = pages.map(page => ({
        id: page.id,
        image: page.image, // Can be File or URL
        caption: page.caption
      }));

      await updateComic(editId, pagesToSave, comicTitle);
      
      alert('Comic updated successfully!');
      
    } catch (error) {
      alert(`Failed to update comic: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading comic...</p>
        </div>
      </div>
    );
  }

  if (error || !originalComic || !editId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Comic Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The comic you\'re looking for doesn\'t exist.'}</p>
          <Link
            href="/"
            className="px-6 py-3 border-2 border-black text-black font-medium hover:bg-black hover:text-white transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Edit Comic</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {pages.length > 0 ? `Page ${currentPageIndex + 1} of ${pages.length}` : 'No pages created'}
              </span>
              <Link
                href={`/comic/${editId}`}
                className="px-4 py-2 border-2 border-blue-500 text-blue-500 font-medium hover:bg-blue-500 hover:text-white transition-colors"
              >
                View Comic
              </Link>
              <Link
                href="/"
                className="px-4 py-2 border-2 border-black text-black font-medium hover:bg-black hover:text-white transition-colors"
              >
                ← Create New Comic
              </Link>
            </div>
          </div>
          
          {/* Comic Title and Save */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Comic Title</label>
              <input
                type="text"
                value={comicTitle}
                onChange={(e) => setComicTitle(e.target.value)}
                placeholder="Enter comic title..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <button
              onClick={handleSaveComic}
              disabled={isSaving || pages.length === 0}
              className="px-6 py-3 border-2 border-green-500 text-green-500 font-medium hover:bg-green-500 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Panel - Current Page Display */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Current Page</h2>
            </div>
            
            <div className="p-6">
              {currentPage ? (
                <div className="space-y-4">
                  <div 
                    {...getReplaceRootProps()}
                    className="cursor-pointer hover:opacity-80 transition-opacity group relative"
                  >
                    <input {...getReplaceInputProps()} />
                    <Image 
                      src={currentPage.image instanceof File ? URL.createObjectURL(currentPage.image) : currentPage.image} 
                      alt="Comic panel" 
                      className="current-page-image"
                      width={800}
                      height={600}
                      style={{ objectFit: 'contain' }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <p className="text-white font-medium">Click to change image</p>
                    </div>
                  </div>
                  
                  {isEditingText ? (
                    <div className="space-y-3">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveEditedText}
                          className="px-4 py-2 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditingText}
                          className="px-4 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={startEditingText}
                      className="text-gray-700 font-medium cursor-pointer hover:bg-gray-100 p-3 rounded transition-colors border-2 border-dashed border-gray-300"
                      title="Click to edit text"
                    >
                      {currentPage.caption}
                    </div>
                  )}

                  {/* Navigation Controls */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPageIndex <= 0}
                      className="px-4 py-2 border-2 border-black text-black font-medium hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← Previous
                    </button>
                    
                    <button
                      onClick={goToNextPage}
                      disabled={currentPageIndex >= pages.length - 1}
                      className="px-4 py-2 border-2 border-black text-black font-medium hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next →
                    </button>
                    
                    <button
                      onClick={removeCurrentPage}
                      className="px-4 py-2 border-2 border-red-500 text-red-500 font-medium hover:bg-red-500 hover:text-white transition-colors"
                    >
                      Remove Page
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <p className="text-lg">No pages created yet</p>
                  <p className="text-sm">Create your first page using the form on the right →</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Create New Page */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Add New Page</h2>
            </div>
            
            {/* Upload Area */}
            <div className="p-6 border-b">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
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
                    <Image 
                      src={imagePreview} 
                      alt="Preview" 
                      className="preview-image"
                      width={400}
                      height={300}
                      style={{ objectFit: 'contain' }}
                    />
                    <p className="text-green-600 font-medium">Image selected</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-red-600 text-lg font-medium">Upload Image</p>
                    <p className="text-gray-500 text-sm">
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

            {/* Create Button */}
            <div className="p-6">
              <button
                onClick={createNewPage}
                disabled={isUploading || !image || !caption.trim()}
                className="w-full px-6 py-3 border-2 border-black text-black font-medium hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Adding...' : 'Add Page'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditComicPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-300 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading editor...</p>
        </div>
      </div>
    }>
      <EditComicContent />
    </Suspense>
  );
}