-- 1. Active RLS sur la table profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Politique : un utilisateur peut lire son propre profil
CREATE POLICY "users_read_own_profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 3. Politique : un utilisateur peut créer son propre profil
CREATE POLICY "users_insert_own_profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 4. Trigger : crée automatiquement un profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, pseudo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'pseudo', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
