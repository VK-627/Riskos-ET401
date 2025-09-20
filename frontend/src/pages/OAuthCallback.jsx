import { useEffect, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      // Save token and fetch user
      localStorage.setItem('token', token);
      axios
        .get('http://localhost:5000/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          // update context user if setter exists
          if (setUser) setUser(res.data);
          navigate('/');
        })
        .catch(() => {
          // on error, remove token and go to login
          localStorage.removeItem('token');
          navigate('/login');
        });
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate, setUser]);

  return <div className="p-8">Signing you in...</div>;
}
