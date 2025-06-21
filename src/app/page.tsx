'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import { useRouter, useSearchParams } from 'next/navigation';
import { saveComic, getComic, updateComic } from '../../lib/supabase-utils';
import './styles/cms.css';

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
  const [imageUrl, setImageUrl] = useState('');
  const [imageInputType, setImageInputType] = useState<'upload' | 'url'>('upload');
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editText, setEditText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [comicTitle, setComicTitle] = useState('');
  const [savedComicId, setSavedComicId] = useState<string | null>(null);
  const [showShareLinks, setShowShareLinks] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);

  const currentPage = pages[currentPageIndex] || null;
  const isEditMode = !!editId;

  // Autosave whenever pages change
  useEffect(() => {
    const autoSave = async () => {
      if (pages.length > 0 && comicTitle && isEditMode) {
        setAutosaveStatus('saving');
        try {
          const pagesForSaving = pages.map(page => ({
            id: page.id,
            image: page.image instanceof File ? page.image : page.image,
            caption: page.caption
          }));
          
          await updateComic(editId!, pagesForSaving, comicTitle);
          setAutosaveStatus('saved');
          
          // Reset to idle after 3 seconds
          setTimeout(() => {
            setAutosaveStatus('idle');
          }, 3000);
        } catch (error) {
          console.error('Autosave failed:', error);
          setAutosaveStatus('idle');
        }
      }
    };

    autoSave();
  }, [pages, comicTitle, editId, isEditMode]);

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
          
          const localPages = comicData.pages.map(page => ({
            id: page.id!,
            image: page.image_url,
            caption: page.caption,
            createdAt: new Date()
          }));
          
          setPages(localPages);
          setCurrentPageIndex(0);
        }
      } catch (error) {
        console.error('Error loading comic:', error);
        setError('Failed to load comic');
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
      setImageUrl('');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: false
  });

  const handleImageUrlSubmit = () => {
    if (imageUrl) {
      setImagePreview(imageUrl);
      setImage(null);
    }
  };

  const createNewPage = async () => {
    if ((!image && !imageUrl) || !caption.trim()) {
      alert('Please add both an image and caption');
      return;
    }

    setIsUploading(true);
    
    try {
      const newPage = {
        id: Date.now().toString(),
        image: image || imageUrl,
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
      setImageUrl('');
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
      console.log('Saving comic with pages:', pages);
      
      let comicId;
      
      if (isEditMode && editId) {
        const pagesForSaving = pages.map(page => ({
          id: page.id,
          image: page.image instanceof File ? page.image : page.image,
          caption: page.caption
        }));
        console.log('Updating comic with pages:', pagesForSaving);
        await updateComic(editId, pagesForSaving, comicTitle);
        comicId = editId;
      } else {
        const pagesForSaving = pages.map(({ image, caption }) => ({ image, caption }));
        comicId = await saveComic(pagesForSaving, comicTitle || 'My Comic');
        router.push(`/?id=${comicId}`);
      }
      
      setSavedComicId(comicId);
      setShowShareLinks(true);
      
    } catch (error) {
      console.error('Error saving comic:', error);
      alert(`Failed to save comic: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy link:', error);
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
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading comic...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="content-container">
        <div className="header-section">
          <div className="header-content">
            <div className="flex items-center gap-6">
              <h1 className="page-title">Comic CMS</h1>
              
              {/* Share Links - Top Position */}
              {showShareLinks && savedComicId && (
                <div className="share-links-container">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-green-700">Share:</span>
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/comic/${savedComicId}`)}
                        className="share-button"
                      >
                        Copy View Link
                      </button>
                      <Link
                        href={`/comic/${savedComicId}`}
                        target="_blank"
                        className="view-button"
                      >
                        View
                      </Link>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-green-700">Edit:</span>
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/?id=${savedComicId}`)}
                        className="share-button"
                      >
                        Copy Edit Link
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="header-controls">
              <span className="page-counter">
                {pages.length > 0 ? `Page ${currentPageIndex + 1} of ${pages.length}` : 'No pages created'}
              </span>
              {autosaveStatus !== 'idle' && (
                <div className={`autosave-indicator ${autosaveStatus}`}>
                  {autosaveStatus === 'saving' ? '💾 Saving...' : '✓ Saved'}
                </div>
              )}
              {isEditMode && (
                <button
                  onClick={handleNewComic}
                  className="new-comic-button"
                >
                  + New Comic
                </button>
              )}
            </div>
          </div>
          
          {/* Comic Title and Save */}
          <div className="title-section">
            <div className="title-input-container">
              <label className="input-label">Comic Title</label>
              <input
                type="text"
                value={comicTitle}
                onChange={(e) => setComicTitle(e.target.value)}
                placeholder="Enter comic title..."
                className="title-input"
              />
            </div>
            <button
              onClick={handleSaveComic}
              disabled={isSaving || pages.length === 0}
              className="save-button"
            >
              {isSaving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Save & Share Comic'}
            </button>
          </div>
        </div>

        <div className="panels-container">
          {/* Current Page Display */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Current Page</h2>
            </div>
            
            <div className="panel-content">
              {currentPage ? (
                <div className="current-page-content">
                  <div 
                    {...getReplaceRootProps()}
                    className="current-page-image-container"
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
                    <div className="image-overlay">
                      <p className="overlay-text">Click to change image</p>
                    </div>
                  </div>
                  
                  {isEditingText ? (
                    <div className="edit-text-container">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="edit-text-input"
                        rows={3}
                        autoFocus
                      />
                      <div className="edit-buttons">
                        <button
                          onClick={saveEditedText}
                          className="save-text-button"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditingText}
                          className="cancel-text-button"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onClick={startEditingText}
                      className="text-display"
                      title="Click to edit text"
                    >
                      {currentPage.caption}
                    </div>
                  )}

                  {/* Navigation Controls */}
                  <div className="navigation-controls">
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPageIndex <= 0}
                      className="nav-button"
                    >
                      ← Previous
                    </button>
                    
                    <button
                      onClick={goToNextPage}
                      disabled={currentPageIndex >= pages.length - 1}
                      className="nav-button"
                    >
                      Next →
                    </button>
                    
                    <button
                      onClick={removeCurrentPage}
                      className="remove-button"
                    >
                      Remove Page
                    </button>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p className="empty-title">No pages created yet</p>
                  <p className="empty-subtitle">Create your first page using the form on the right →</p>
                </div>
              )}
            </div>
          </div>

          {/* Create New Page */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="panel-title">{isEditMode ? 'Add New Page' : 'Create New Page'}</h2>
            </div>
            
            {/* Image Input Tabs */}
            <div className="image-input-container">
              <div className="image-input-tabs">
                <button 
                  className={`image-input-tab ${imageInputType === 'upload' ? 'active' : ''}`}
                  onClick={() => setImageInputType('upload')}
                >
                  Upload Image
                </button>
                <button 
                  className={`image-input-tab ${imageInputType === 'url' ? 'active' : ''}`}
                  onClick={() => setImageInputType('url')}
                >
                  Image URL
                </button>
              </div>

              {imageInputType === 'upload' ? (
                <div
                  {...getRootProps()}
                  className={`dropzone ${isDragActive ? 'active' : ''}`}
                >
                  <input {...getInputProps()} />
                  {imagePreview && image ? (
                    <div className="preview-container">
                      <Image 
                        src={imagePreview} 
                        alt="Preview" 
                        className="preview-image"
                        width={400}
                        height={300}
                        style={{ objectFit: 'contain' }}
                      />
                      <p className="preview-text">Image selected</p>
                    </div>
                  ) : (
                    <div className="upload-prompt">
                      <p className="upload-title">Upload Image</p>
                      <p className="upload-subtitle">
                        {isDragActive ? 'Drop the image here' : 'Drag & drop an image or click to select'}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="url-input-container">
                  <div className="url-input-wrapper">
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Enter image URL..."
                      className="url-input"
                    />
                    <button
                      onClick={handleImageUrlSubmit}
                      disabled={!imageUrl}
                      className="preview-button"
                    >
                      Preview Image
                    </button>
                  </div>
                  {imagePreview && !image && (
                    <div className="preview-container">
                      <Image 
                        src={imagePreview} 
                        alt="Preview" 
                        className="preview-image"
                        width={400}
                        height={300}
                        style={{ objectFit: 'contain' }}
                      />
                      <p className="preview-text">Image URL preview</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Text Caption */}
            <div className="caption-container">
              <div className="caption-input-wrapper">
                <label className="input-label">Text</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Enter your caption here..."
                  className="caption-input"
                  rows={4}
                />
              </div>
            </div>

            {/* Create Button */}
            <div className="create-button-container">
              <button
                onClick={createNewPage}
                disabled={isUploading || (!image && !imageUrl) || !caption.trim()}
                className="create-button"
              >
                {isUploading ? 'Creating...' : 'Create Page'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Test comment