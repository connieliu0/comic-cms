import { supabase } from './supabase';

export interface ComicPage {
  id?: string;
  page_number: number;
  image_url: string;
  caption: string;
}

export interface Comic {
  id?: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
  pages?: ComicPage[];
}

export async function uploadImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('comic-images')
    .upload(fileName, file);

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('comic-images')
    .getPublicUrl(fileName);

  return publicUrl;
}

async function convertBlobUrlToFile(blobUrl: string): Promise<File> {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new File([blob], 'image.jpg', { type: blob.type });
}

async function generateUniqueComicId(): Promise<string> {
  let comicId: string;
  let isUnique = false;

  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
  while (!isUnique) {
    comicId = '';
    for (let i = 0; i < 5; i++) {
      comicId += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const { data, error } = await supabase
      .from('comics')
      .select('id')
      .eq('id', comicId)
      .single();

    if (!data && (error?.code === 'PGRST116' || error === null)) {
      // PGRST116: "The result contains 0 rows" which means the ID is unique
      isUnique = true;
    } else if (error) {
      // Handle other potential errors
      throw new Error('Failed to check for unique comic ID');
    }
  }
  return comicId!;
}

export async function saveComic(pages: { image: File | string; caption: string }[], title?: string): Promise<string> {
  try {
    // Generate a unique 5-character ID
    const comicId = await generateUniqueComicId();

    // Create comic record
    const { error: comicError } = await supabase
      .from('comics')
      .insert([{ id: comicId, title: title || 'Untitled Comic' }]);

    if (comicError) {
      throw new Error(`Failed to create comic: ${comicError.message}`);
    }

    // Upload images and create pages
    const comicPages = [];
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      let imageUrl: string;
      
      if (page.image instanceof File) {
        imageUrl = await uploadImage(page.image);
      } else if (typeof page.image === 'string' && page.image.startsWith('blob:')) {
        // Convert blob URL to File and upload
        const file = await convertBlobUrlToFile(page.image);
        imageUrl = await uploadImage(file);
      } else {
        imageUrl = page.image; // Already a URL (for existing pages)
      }

      comicPages.push({
        comic_id: comicId,
        page_number: i + 1,
        image_url: imageUrl,
        caption: page.caption
      });
    }

    const { error: pagesError } = await supabase
      .from('comic_pages')
      .insert(comicPages);

    if (pagesError) {
      throw new Error(`Failed to create pages: ${pagesError.message}`);
    }

    return comicId;
  } catch (error) {
    console.error('Error saving comic:', error);
    throw error;
  }
}

export async function getComic(id: string): Promise<Comic | null> {
  try {
    const { data: comic, error: comicError } = await supabase
      .from('comics')
      .select('*')
      .eq('id', id)
      .single();

    if (comicError) {
      console.error('Error fetching comic:', comicError);
      return null;
    }

    const { data: pages, error: pagesError } = await supabase
      .from('comic_pages')
      .select('*')
      .eq('comic_id', id)
      .order('page_number');

    if (pagesError) {
      console.error('Error fetching pages:', pagesError);
      return null;
    }

    return {
      ...comic,
      pages: pages || []
    };
  } catch (error) {
    console.error('Error getting comic:', error);
    return null;
  }
}

export async function updateComic(id: string, pages: { id?: string; image: File | string; caption: string }[], title?: string): Promise<void> {
  try {
    // Update comic title if provided
    if (title) {
      const { error: comicError } = await supabase
        .from('comics')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (comicError) {
        throw new Error(`Failed to update comic: ${comicError.message}`);
      }
    }

    // Delete all existing pages
    const { error: deleteError } = await supabase
      .from('comic_pages')
      .delete()
      .eq('comic_id', id);

    if (deleteError) {
      throw new Error(`Failed to delete existing pages: ${deleteError.message}`);
    }

    // Create new pages
    const comicPages = [];
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      let imageUrl: string;
      
      if (page.image instanceof File) {
        imageUrl = await uploadImage(page.image);
      } else if (typeof page.image === 'string' && page.image.startsWith('blob:')) {
        // Convert blob URL to File and upload
        const file = await convertBlobUrlToFile(page.image);
        imageUrl = await uploadImage(file);
      } else {
        imageUrl = page.image; // Already a URL
      }

      comicPages.push({
        comic_id: id,
        page_number: i + 1,
        image_url: imageUrl,
        caption: page.caption
      });
    }

    const { error: pagesError } = await supabase
      .from('comic_pages')
      .insert(comicPages);

    if (pagesError) {
      throw new Error(`Failed to create pages: ${pagesError.message}`);
    }
  } catch (error) {
    console.error('Error updating comic:', error);
    throw error;
  }
}