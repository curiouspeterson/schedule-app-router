-- Add policy to allow profile creation for authenticated users
CREATE POLICY "Enable insert for authenticated users only"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Add policy to allow profile selection for authenticated users
CREATE POLICY "Enable select for authenticated users"
ON profiles FOR SELECT
TO authenticated
USING (true); 