'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useDropzone } from 'react-dropzone';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveComic, getComic, updateComic } from '../../lib/supabase-utils';

interface Page {
  id: string;
  image: File | string;
  caption: string;
  createdAt: Date;
}

export default function ComicCMS() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');
  
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editText, setEditText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [comicTitle, setComicTitle] = useState('');
  const [savedComicId, setSavedComicId] = useState<string | null>(null);
  const [showShareLinks, setShowShareLinks] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentPage = pages[currentPageIndex] || null;
  const isEditMode = !!editId;

  // Load existing comic if editing
  useEffect(() => {
    async function loadComic() {
      if (!editId) return;
      
      setLoading(true);
      try {
        const comicData = await getComic(editId);
        if (comicData && comicData.pages) {
          setComicTitle(comicData.title || '');
          setSavedComicId(editId);
          setShowShareLinks(true);
          
          // Convert comic pages to local format
          const localPages = comicData.pages.map(page => ({
            id: page.id!,
            image: page.image_url,
            caption: page.caption,
            createdAt: new Date()
          }));
          
          setPages(localPages);
          setCurrentPageIndex(0);
        }
      } catch (err) {
        console.error('Error loading comic:', err);
      } finally {
        setLoading(false);
      }
    }

    loadComic();
  }, [editId]);

  const onDrop = (acceptedFiles: File[]) => {
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
        image: image,
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

  const replaceCurrentImage = (acceptedFiles: File[]) => {
    if (currentPage && acceptedFiles[0]) {
      const file = acceptedFiles[0];
      
      const updatedPages = [...pages];
      updatedPages[currentPageIndex] = {
        ...currentPage,
        image: file
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

    setIsSaving(true);
    
    try {
      const pagesToSave = pages.map(page => ({
        ...(isEditMode && { id: page.id }),
        image: page.image,
        caption: page.caption
      }));

      let comicId;
      
      if (isEditMode && editId) {
        // Update existing comic
        await updateComic(editId, pagesToSave, comicTitle);
        comicId = editId;
      } else {
        // Create new comic
        const pagesForSaving = pages.map(({ image, caption }) => ({ image, caption }));
        comicId = await saveComic(pagesForSaving, comicTitle || 'My Comic');
        // Immediately redirect to edit URL
        router.push(`/?id=${comicId}`);
      }
      
      setSavedComicId(comicId);
      setShowShareLinks(true);
      
    } catch (error: any) {
      alert(`Failed to save comic: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Link copied to clipboard!');
    } catch (err) {
      alert('Failed to copy link');
    }
  };

  const handleNewComic = () => {
    router.push('/');
    setPages([]);
    setCurrentPageIndex(0);
    setComicTitle('');
    setSavedComicId(null);
    setShowShareLinks(false);
    setImage(null);
    setImagePreview('');
    setCaption('');
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

  return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-6">
              <h1 className="text-3xl font-bold">Comic CMS</h1>
              
              {/* Share Links - Top Position */}
              {showShareLinks && savedComicId && (
                <div className="flex items-center gap-4 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-green-700">Share:</span>
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/comic/${savedComicId}`)}
                      className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                    >
                      Copy View Link
                    </button>
                    <Link
                      href={`/comic/${savedComicId}`}
                      target="_blank"
                      className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                    >
                      View
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-green-700">Edit:</span>
                    <button
                      onClick={() => copyToClipboard(`${window.location.origin}/?id=${savedComicId}`)}
                      className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors"
                    >
                      Copy Edit Link
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {pages.length > 0 ? `Page ${currentPageIndex + 1} of ${pages.length}` : 'No pages created'}
              </span>
              {isEditMode && (
                <button
                  onClick={handleNewComic}
                  className="px-4 py-2 border-2 border-blue-500 text-blue-500 font-medium hover:bg-blue-500 hover:text-white transition-colors"
                >
                  + New Comic
                </button>
              )}
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
              {isSaving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save & Share Comic'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Current Page Display */}
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
                    <img 
                      src={currentPage.image instanceof File ? URL.createObjectURL(currentPage.image) : currentPage.image} 
                      alt="Comic panel" 
                      className="w-full max-h-64 object-contain mx-auto rounded-lg shadow-sm"
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

              {/* Create New Page */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">{isEditMode ? 'Add New Page' : 'Create New Page'}</h2>
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
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="max-h-48 mx-auto rounded-lg shadow-sm"
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
                    {isUploading ? 'Creating...' : 'Create Page'}
                  </button>
                </div>
              </div>
            </div>
          </div>
  );
}

// Test comment