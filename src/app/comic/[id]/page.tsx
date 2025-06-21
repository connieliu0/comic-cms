'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getComic, Comic } from '../../../../lib/supabase-utils';

interface ComicViewProps {
  params: {
    id: string;
  };
}

export default function ComicView({ params }: ComicViewProps) {
  const [comic, setComic] = useState<Comic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadComic() {
      try {
        const comicData = await getComic(params.id);
        if (comicData) {
          setComic(comicData);
        } else {
          setError('Comic not found');
        }
      } catch (err) {
        setError('Failed to load comic');
        console.error('Error loading comic:', err);
      } finally {
        setLoading(false);
      }
    }

    loadComic();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-300 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading comic...</p>
        </div>
      </div>
    );
  }

  if (error || !comic || !comic.pages || comic.pages.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Comic Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The comic you\'re looking for doesn\'t exist or has no pages.'}</p>
          <Link
            href="/"
            className="px-6 py-3 border-2 border-black text-black font-medium hover:bg-black hover:text-white transition-colors"
          >
            ← Create a new comic
          </Link>
        </div>
      </div>
    );
  }

  // For this view, we'll just show the first page as a single panel
  const firstPage = comic.pages[0];

  return (
    <div className="h-screen w-full bg-white font-serif overflow-hidden">
      <div className="relative w-full max-w-2xl h-full mx-auto">
        <div className="absolute inset-0">
          <img 
            src={firstPage.image_url} 
            alt={firstPage.caption || 'Comic panel'}
            className="w-full h-full object-cover"
          />
        </div>
        <div 
          className="absolute bottom-0 left-0 right-0 h-1/3"
          style={{
            background: 'linear-gradient(to top, white 20%, rgba(255,255,255,0) 100%)'
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 p-8 flex items-center justify-center">
          <p className="text-center text-xl md:text-2xl text-red-600">
            {firstPage.caption}
          </p>
        </div>
      </div>
    </div>
  );
}