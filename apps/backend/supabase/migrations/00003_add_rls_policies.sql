-- Enable insert and update for service role
create policy "Enable insert for service role" on documentation
  for insert
  with check (true);

create policy "Enable update for service role" on documentation
  for update
  using (true);
