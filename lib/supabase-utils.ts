import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing environment variable NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export interface ComicPage {
  id?: string;
  image_url?: string;
  caption: string;
  image?: File;
}

export interface Comic {
  id?: string;
  title?: string;
  pages?: ComicPage[];
}

export async function saveComic(pages: ComicPage[], title: string): Promise<string> {
  try {
    // Generate a new UUID for the comic
    const comicId = uuidv4();

    // First, create the comic entry
    const { error: comicError } = await supabase
      .from('comics')
      .insert([{ id: comicId, title }]);

    if (comicError) {
      throw new Error(`Error creating comic: ${comicError.message}`);
    }

    // Then, handle image uploads and create pages
    const pagesWithUrls = await Promise.all(
      pages.map(async (page, index) => {
        let image_url = page.image_url;

        // If there's a File object, upload it
        if (page.image instanceof File) {
          const fileName = `${comicId}/${uuidv4()}-${page.image.name}`;
          const { error: uploadError, data } = await supabase.storage
            .from('comics')
            .upload(fileName, page.image);

          if (uploadError) {
            throw new Error(`Error uploading image: ${uploadError.message}`);
          }

          // Get the public URL for the uploaded file
          const { data: { publicUrl } } = supabase.storage
            .from('comics')
            .getPublicUrl(fileName);

          image_url = publicUrl;
        }

        return {
          id: uuidv4(), // Generate UUID for each page
          comic_id: comicId,
          page_number: index + 1,
          image_url,
          caption: page.caption
        };
      })
    );

    // Insert all pages into comic_pages table
    const { error: pagesError } = await supabase
      .from('comic_pages')
      .insert(pagesWithUrls);

    if (pagesError) {
      throw new Error(`Error creating pages: ${pagesError.message}`);
    }

    return comicId;
  } catch (error) {
    console.error('Error in saveComic:', error);
    throw new Error(`Failed to save comic: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function updateComic(comicId: string, pages: ComicPage[], title: string): Promise<void> {
  try {
    // Update comic title
    const { error: titleError } = await supabase
      .from('comics')
      .update({ title })
      .eq('id', comicId);

    if (titleError) {
      throw new Error(`Error updating comic title: ${titleError.message}`);
    }

    // First, get existing pages to determine what needs to be deleted
    const { data: existingPages, error: fetchError } = await supabase
      .from('comic_pages')
      .select('id')
      .eq('comic_id', comicId);

    if (fetchError) {
      throw new Error(`Error fetching existing pages: ${fetchError.message}`);
    }

    const existingIds = new Set(existingPages?.map(p => p.id) || []);
    const updatedIds = new Set(pages.filter(p => p.id).map(p => p.id));

    // Delete pages that no longer exist
    const idsToDelete = [...existingIds].filter(id => !updatedIds.has(id));
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('comic_pages')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        throw new Error(`Error deleting removed pages: ${deleteError.message}`);
      }
    }

    // Handle each page
    await Promise.all(
      pages.map(async (page, index) => {
        let image_url = page.image_url;

        // If there's a File object, upload it
        if (page.image instanceof File) {
          const fileName = `${comicId}/${uuidv4()}-${page.image.name}`;
          const { error: uploadError } = await supabase.storage
            .from('comics')
            .upload(fileName, page.image);

          if (uploadError) {
            throw new Error(`Error uploading image: ${uploadError.message}`);
          }

          // Get the public URL for the uploaded file
          const { data: { publicUrl } } = supabase.storage
            .from('comics')
            .getPublicUrl(fileName);

          image_url = publicUrl;
        }

        // If page has an ID, update it, otherwise create new
        if (page.id && existingIds.has(page.id)) {
          const { error: updateError } = await supabase
            .from('comic_pages')
            .update({ 
              image_url, 
              caption: page.caption,
              page_number: index + 1 
            })
            .eq('id', page.id);

          if (updateError) {
            throw new Error(`Error updating page: ${updateError.message}`);
          }
        } else {
          // Generate new UUID for new pages
          const { error: insertError } = await supabase
            .from('comic_pages')
            .insert([{
              id: uuidv4(),
              comic_id: comicId,
              image_url,
              caption: page.caption,
              page_number: index + 1
            }]);

          if (insertError) {
            throw new Error(`Error creating new page: ${insertError.message}`);
          }
        }
      })
    );
  } catch (error) {
    console.error('Error in updateComic:', error);
    throw new Error(`Failed to update comic: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getComic(id: string): Promise<Comic | null> {
  try {
    // Get comic details
    const { data: comic, error: comicError } = await supabase
      .from('comics')
      .select('*')
      .eq('id', id)
      .single();

    if (comicError) {
      throw new Error(`Error fetching comic: ${comicError.message}`);
    }

    // Get comic pages
    const { data: pages, error: pagesError } = await supabase
      .from('comic_pages')
      .select('*')
      .eq('comic_id', id)
      .order('page_number', { ascending: true });

    if (pagesError) {
      throw new Error(`Error fetching pages: ${pagesError.message}`);
    }

    return {
      ...comic,
      pages: pages || []
    };
  } catch (error) {
    console.error('Error in getComic:', error);
    throw new Error(`Failed to get comic: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}