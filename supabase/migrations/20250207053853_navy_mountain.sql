/*
  # Update diagnostic centers RLS policies

  1. Changes
    - Add INSERT policy for diagnostic_centers table
    - Add UPDATE policy for diagnostic_centers table
    - Add DELETE policy for diagnostic_centers table

  2. Security
    - Allow new centers to register (INSERT)
    - Allow centers to update their own data (UPDATE)
    - Allow centers to delete their account (DELETE)
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Centers can view own data" ON diagnostic_centers;

-- Create comprehensive policies
CREATE POLICY "Centers can manage own data"
ON diagnostic_centers
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow new registrations
CREATE POLICY "Anyone can register a new center"
ON diagnostic_centers
FOR INSERT
WITH CHECK (auth.uid() = id);