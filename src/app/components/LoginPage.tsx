import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../lib/auth-context';
import { useCustomersAll } from '../lib/demo-store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Package } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const { login, user } = useAuth();
  const users = useCustomersAll();
  const navigate = useNavigate();

  const handleLogin = (selectedEmail: string) => {
    login(selectedEmail);
    const loggedUser = users.find(u => u.email === selectedEmail);
    if (loggedUser?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/catalog');
    }
  };

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Package className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">B2B PreOrder System</CardTitle>
          <CardDescription>System zarządzania preorderami B2B</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Wprowadź email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && email) {
                  const user = users.find(u => u.email === email);
                  if (user) handleLogin(email);
                }
              }}
            />
          </div>

          <Button 
            className="w-full" 
            onClick={() => email && handleLogin(email)}
            disabled={!email}
          >
            Zaloguj się
          </Button>

          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-600 mb-3">Testowe konta:</p>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-left"
                onClick={() => handleLogin('admin@brookspl.com')}
              >
                <div>
                  <div className="font-medium">Administrator</div>
                  <div className="text-xs text-gray-500">admin@brookspl.com</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-left"
                onClick={() => handleLogin('contact@sportmaxwarszawa.pl')}
              >
                <div>
                  <div className="font-medium">Klient B2B - SportMax Warszawa (P1)</div>
                  <div className="text-xs text-gray-500">contact@sportmaxwarszawa.pl</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-left"
                onClick={() => handleLogin('contact@activesportwrocław.pl')}
              >
                <div>
                  <div className="font-medium">Klient B2B - ActiveSport Wrocław (P3)</div>
                  <div className="text-xs text-gray-500">contact@activesportwrocław.pl</div>
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
