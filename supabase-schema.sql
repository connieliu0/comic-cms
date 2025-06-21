-- Create comics table
CREATE TABLE IF NOT EXISTS comics (
  id TEXT PRIMARY KEY,
  title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create comic_pages table
CREATE TABLE IF NOT EXISTS comic_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comic_id TEXT REFERENCES comics(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  caption TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS comic_pages_comic_id_idx ON comic_pages(comic_id);
CREATE INDEX IF NOT EXISTS comic_pages_page_number_idx ON comic_pages(comic_id, page_number);

-- Enable Row Level Security
ALTER TABLE comics ENABLE ROW LEVEL SECURITY;
ALTER TABLE comic_pages ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access on comics" ON comics FOR SELECT USING (true);
CREATE POLICY "Allow public read access on comic_pages" ON comic_pages FOR SELECT USING (true);
CREATE POLICY "Allow public insert on comics" ON comics FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on comic_pages" ON comic_pages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on comics" ON comics FOR UPDATE USING (true);
CREATE POLICY "Allow public update on comic_pages" ON comic_pages FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on comic_pages" ON comic_pages FOR DELETE USING (true);

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('comic-images', 'comic-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy
CREATE POLICY "Allow public uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'comic-images');
CREATE POLICY "Allow public access" ON storage.objects FOR SELECT USING (bucket_id = 'comic-images');