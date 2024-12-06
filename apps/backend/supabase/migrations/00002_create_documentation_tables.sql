-- Create documentation table
create table if not exists documentation (
  id uuid default gen_random_uuid() primary key,
  url text unique not null,
  section text not null,
  parent_path text,
  content text not null,
  title text not null,
  hierarchy text[] not null,
  last_modified timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create search index
create index if not exists idx_documentation_content on documentation using gin(to_tsvector('english', content));
create index if not exists idx_documentation_title on documentation using gin(to_tsvector('english', title));

-- Enable Row Level Security (RLS)
alter table documentation enable row level security;

-- Create policies
create policy "Enable read access for all users" on documentation for select using (true);

-- Create function to automatically update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create trigger to update updated_at
create trigger update_documentation_updated_at
    before update on documentation
    for each row
    execute procedure update_updated_at_column();
