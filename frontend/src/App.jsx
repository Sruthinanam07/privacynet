import { AuthProvider, useAuth } from './context/AuthContext';
import Auth from './pages/Auth';
import Feed from './pages/Feed';

function Root() {
  const { user } = useAuth();
  return user ? <Feed /> : <Auth />;
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
