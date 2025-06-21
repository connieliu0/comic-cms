'use client'
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { getComic } from '../../../../lib/supabase-utils';
import '../../styles/comic.css';

interface ComicPage {
  id?: string;
  image_url: string;
  caption: string;
}

interface Comic {
  id?: string;
  title?: string;
  pages: ComicPage[];
}

export default function ComicViewer() {
  const { id } = useParams();
  const [comic, setComic] = useState<Comic | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const goToPreviousPage = useCallback(() => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  }, [currentPageIndex]);

  const goToNextPage = useCallback(() => {
    if (comic && currentPageIndex < comic.pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  }, [currentPageIndex, comic]);

  useEffect(() => {
    async function loadComic() {
      try {
        const comicData = await getComic(id as string);
        if (comicData && comicData.pages) {
          setComic({
            id: comicData.id,
            title: comicData.title,
            pages: comicData.pages.map(page => ({
              id: page.id,
              image_url: page.image_url || '',
              caption: page.caption || ''
            }))
          });
        } else {
          setError('Comic not found');
        }
      } catch (error) {
        console.error('Error loading comic:', error);
        setError('Failed to load comic');
      } finally {
        setLoading(false);
      }
    }

    loadComic();
  }, [id]);

  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        goToPreviousPage();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        goToNextPage();
      }
    }

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [goToPreviousPage, goToNextPage]);

  if (loading) {
    return (
      <div className="loading-container">
        <div>
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading comic...</p>
        </div>
      </div>
    );
  }

  if (error || !comic) {
    return (
      <div className="error-container">
        <h1 className="error-title">Oops!</h1>
        <p className="error-message">{error || 'Something went wrong'}</p>
        <Link href="/" className="back-button">
          ← Back to Home
        </Link>
      </div>
    );
  }

  const currentPage = comic.pages[currentPageIndex];

  return (
    <div className="comic-container">
      <div className="comic-content">
        <div className="comic-header">
          <h1 className="comic-title">{comic.title || 'Untitled Comic'}</h1>
          <div className="comic-navigation">
            <button
              onClick={goToPreviousPage}
              disabled={currentPageIndex <= 0}
              className="nav-button"
            >
              ← Previous
            </button>
            <span className="page-info">
              Page {currentPageIndex + 1} of {comic.pages.length}
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPageIndex >= comic.pages.length - 1}
              className="nav-button"
            >
              Next →
            </button>
          </div>
        </div>

        <div className="comic-page">
          <div className="page-image-container">
            <Image 
              src={currentPage.image_url} 
              alt={`Page ${currentPageIndex + 1}`}
              className="page-image"
              width={800}
              height={600}
              style={{ objectFit: 'contain' }}
            />
          </div>
          <div className="page-caption">
            {currentPage.caption}
          </div>
        </div>

        <div className="navigation-overlay">
          <div 
            className="nav-area prev"
            onClick={goToPreviousPage}
            style={{ visibility: currentPageIndex <= 0 ? 'hidden' : 'visible' }}
          >
            <div className="nav-hint">Previous Page</div>
          </div>
          <div 
            className="nav-area next"
            onClick={goToNextPage}
            style={{ visibility: currentPageIndex >= comic.pages.length - 1 ? 'hidden' : 'visible' }}
          >
            <div className="nav-hint">Next Page</div>
          </div>
        </div>

        <div className="keyboard-hint">
          Use arrow keys to navigate
        </div>
      </div>
    </div>
  );
}